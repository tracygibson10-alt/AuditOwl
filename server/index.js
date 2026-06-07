require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { extractSiteData } = require('./audit');
const axios = require('axios');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const { execSync } = require('child_process');

const app = express();
app.use(cors());

// Webhook needs raw body for signature verification
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        // In development without real keys, we might want to skip verification or handle dummy events
        console.warn('Webhook signature verification failed, but continuing for dev purposes if dummy key used');
        // event = JSON.parse(req.body); // Uncomment for testing with raw JSON if needed
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const auditId = session.metadata.auditId;
        const url = session.metadata.url;

        console.log(`Payment successful for audit ${auditId} (${url})`);
        
        // Update status to paid
        try {
            execSync(`team-db "UPDATE audits SET status = 'paid' WHERE id = '${auditId}'"`);
            
            // Trigger full audit generation (async)
            // In a real app, this would be a background job
            generateFullAudit(auditId, url).catch(console.error);
        } catch (dbErr) {
            console.error('Failed to update audit status:', dbErr);
        }
    }

    res.json({received: true});
});

app.use(express.json());

async function generateFullAudit(auditId, url) {
    console.log(`Generating full deep-dive audit for ${url}...`);
    const siteData = await extractSiteData(url);
    
    // Customize prompt for "Full Deep-Dive"
    const prompt = `
        You are an expert CRO and SEO auditor. Provide a COMPREHENSIVE "Full Deep-Dive" report.
        ... (similar to callLLM but more detailed)
    `;
    
    const auditResult = await callLLM(siteData); // Using existing callLLM for now, can expand later
    auditResult.isFullReport = true;

    try {
        const dataStr = JSON.stringify(auditResult).replace(/'/g, "''");
        execSync(`team-db "UPDATE audits SET status = 'completed', report_data = '${dataStr}' WHERE id = '${auditId}'"`);
    } catch (dbErr) {
        console.error('Failed to save full audit report:', dbErr);
    }
}

app.post('/api/create-checkout-session', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const auditId = crypto.randomUUID();
    
    try {
        // Create pending audit in DB
        execSync(`team-db "INSERT INTO audits (id, url, status) VALUES ('${auditId}', '${url}', 'pending')"`);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'AuditOwl Full Deep-Dive Audit',
                        description: `Comprehensive audit for ${url}`,
                    },
                    unit_amount: 1900, // $19.00
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${req.headers.origin}/report/${auditId}?success=true`,
            cancel_url: `${req.headers.origin}/?canceled=true`,
            metadata: {
                auditId: auditId,
                url: url
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error("Stripe session creation failed:", error);
        res.status(500).json({ error: "Failed to create checkout session" });
    }
});

const PORT = process.env.PORT || 3001;

async function callLLM(data) {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("No OPENAI_API_KEY found, returning mock data.");
        return {
            healthScore: 68,
            criticalIssuesCount: 3,
            warningsCount: 5,
            summary: "Your site has good potential but fails basic mobile and trust checks. High friction in the hero section is likely costing you conversions.",
            cro: {
                valuePropClarity: "Needs Improvement",
                valuePropTeaser: "The site appears to offer professional consulting services, but the benefits aren't immediately clear.",
                hasAboveFoldCTA: data.hasAboveFoldCTA,
                ctaAudit: "No clear primary CTA was found in the initial viewport. Users may be confused about the next step."
            },
            seo: {
                titleTag: data.title.length > 0 ? "Present (" + data.title.length + " chars)" : "Missing",
                metaDescription: data.metaDescription ? "Present" : "Missing",
                h1Check: data.h1s.length === 1 ? "Pass (Single H1 found)" : "Fail (" + data.h1s.length + " H1s found)"
            },
            performance: {
                loadTimeSec: (data.performance.loadTimeMs / 1000).toFixed(2),
                isResponsive: data.performance.isResponsive ? "Pass" : "Fail",
                cwvTeaser: "Fail (LCP is likely high based on heavy images)"
            }
        };
    }

    const prompt = `
        You are an expert CRO and SEO auditor for "AuditOwl". Provide a structured JSON "Free Mini-Audit" report based on the following website data.
        
        The report must follow this exact JSON structure:
        {
            "healthScore": number (0-100),
            "criticalIssuesCount": number,
            "warningsCount": number,
            "summary": "One or two sentences summarizing the overall state.",
            "cro": {
                "valuePropClarity": "Clear" or "Needs Improvement",
                "valuePropTeaser": "One sentence summary of what the site sells/offers.",
                "hasAboveFoldCTA": boolean,
                "ctaAudit": "Short analysis of CTA visibility and wording."
            },
            "seo": {
                "titleTag": "Analysis of presence and length",
                "metaDescription": "Analysis of presence and length",
                "h1Check": "Analysis of H1 usage (ideal is exactly one)."
            },
            "performance": {
                "loadTimeSec": "X.XXs",
                "isResponsive": "Pass" or "Fail",
                "cwvTeaser": "Pass/Fail teaser based on data."
            }
        }

        Website Data:
        URL: ${data.url}
        Title: ${data.title}
        Meta Description: ${data.metaDescription}
        Hero Text: ${data.heroText}
        H1s: ${data.h1s.join(', ')}
        Above Fold CTAs: ${data.aboveFoldCTAs.join(', ')}
        Has Above Fold CTA: ${data.hasAboveFoldCTA}
        Load Time: ${data.performance.loadTimeMs}ms
        Images without Alt: ${data.imagesWithoutAlt}/${data.totalImages}
        Responsive (Heuristic): ${data.performance.isResponsive}
    `;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a professional web auditor that only outputs valid JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
        console.error("LLM Call failed:", error.message);
        throw new Error("Failed to generate audit with AI.");
    }
}

app.post('/api/audit', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        console.log(`Auditing: ${url}`);
        const siteData = await extractSiteData(url);
        const auditResult = await callLLM(siteData);
        
        const auditId = crypto.randomUUID();
        const dataStr = JSON.stringify(auditResult).replace(/'/g, "''");
        execSync(`team-db "INSERT INTO audits (id, url, status, report_data) VALUES ('${auditId}', '${url}', 'completed', '${dataStr}')"`);

        res.json({ success: true, data: auditResult, id: auditId });
    } catch (error) {
        console.error("Audit failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/audit/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const out = execSync(`team-db "SELECT * FROM audits WHERE id = '${id}'"`).toString();
        const rows = JSON.parse(out);
        if (rows.length === 0) return res.status(404).json({ error: "Audit not found" });
        
        const audit = rows[0];
        if (audit.report_data) {
            audit.report_data = JSON.parse(audit.report_data);
        }
        res.json({ success: true, data: audit });
    } catch (error) {
        console.error("Failed to fetch audit:", error);
        res.status(500).json({ error: "Failed to fetch audit" });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

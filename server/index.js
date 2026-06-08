require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { extractSiteData } = require('./audit');
const axios = require('axios');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());

// Helper to run team-db queries safely
function runQuery(sql) {
    const result = spawnSync('team-db', [sql]);
    if (result.status !== 0) {
        const errorMsg = result.stderr.toString() || result.error?.message || 'Unknown team-db error';
        console.error(`DB Error: ${errorMsg}\nQuery: ${sql}`);
        throw new Error('Database operation failed');
    }
    const output = result.stdout.toString();
    try {
        return output ? JSON.parse(output) : [];
    } catch (e) {
        console.error(`Failed to parse team-db output: ${output}`);
        return [];
    }
}

// Webhook needs raw body for signature verification
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy');
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
            runQuery(`UPDATE audits SET status = 'paid' WHERE id = '${auditId}'`);
            
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

const FULL_AUDIT_MODEL = process.env.FULL_AUDIT_MODEL || "gpt-4o";
const MINI_AUDIT_MODEL = process.env.MINI_AUDIT_MODEL || "gpt-4o-mini";

function calculateTrustScore(signals) {
    let score = 0;
    if (signals.hasSSL) score += 15;
    if (signals.hasPhone) score += 15;
    if (signals.hasAddress) score += 10;
    if (signals.hasTrustBadges) score += 10;
    if (signals.hasPaymentIcons) score += 10;
    if (signals.hasReviews) score += 10;
    if (signals.hasRefundPolicy) score += 5;
    if (signals.hasPrivacyPolicy) score += 5;
    if (signals.hasTerms) score += 5;
    if (signals.hasSocialLinks) score += 5;
    if (signals.hasAboutPage) score += 5;
    if (signals.hasLiveChat) score += 5;
    return score;
}

async function generateFullAudit(auditId, url) {
    console.log(`Generating full deep-dive audit for ${url}... using ${FULL_AUDIT_MODEL}`);
    const siteData = await extractSiteData(url);
    
    // Customize prompt for "Full Deep-Dive"
    const prompt = `
        You are an expert CRO and SEO auditor. Provide a COMPREHENSIVE "Full Deep-Dive" report.
        ... (similar to callLLM but more detailed)
    `;
    
    const auditResult = await callLLM(siteData, FULL_AUDIT_MODEL); 
    auditResult.isFullReport = true;

    try {
        const dataStr = JSON.stringify(auditResult).replace(/'/g, "''");
        runQuery(`UPDATE audits SET status = 'completed', report_data = '${dataStr}' WHERE id = '${auditId}'`);
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
        runQuery(`INSERT INTO audits (id, url, status) VALUES ('${auditId}', '${url}', 'pending')`);

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

async function callLLM(data, model = MINI_AUDIT_MODEL) {
    const trustScore = calculateTrustScore(data.trustSignals || {});

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('dummy')) {
        console.warn("No valid OPENAI_API_KEY found, returning mock data.");
        return {
            healthScore: 68,
            trustScore: trustScore,
            criticalIssuesCount: (data.trustSignals?.hasSSL ? 0 : 1) + (data.trustSignals?.hasPhone ? 0 : 1) + 2,
            warningsCount: 5,
            summary: "Your site has good potential but fails basic mobile and trust checks. High friction in the hero section is likely costing you conversions.",
            trust: {
                score: trustScore,
                signals: data.trustSignals,
                analysis: "Basic trust signals like SSL and Contact info are checked. Improving social proof and legal pages will boost your score."
            },
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
            "trustScore": number (0-100),
            "criticalIssuesCount": number,
            "warningsCount": number,
            "summary": "One or two sentences summarizing the overall state.",
            "trust": {
                "score": number,
                "analysis": "Short summary of trust signal strengths and weaknesses."
            },
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

        Trust Signals (Automated Checks):
        - SSL/HTTPS: ${data.trustSignals.hasSSL}
        - Phone Number: ${data.trustSignals.hasPhone}
        - Physical Address/Map: ${data.trustSignals.hasAddress}
        - Trust Badges: ${data.trustSignals.hasTrustBadges}
        - Payment Icons: ${data.trustSignals.hasPaymentIcons}
        - Reviews/Testimonials: ${data.trustSignals.hasReviews}
        - Refund Policy: ${data.trustSignals.hasRefundPolicy}
        - Privacy Policy: ${data.trustSignals.hasPrivacyPolicy}
        - Terms of Service: ${data.trustSignals.hasTerms}
        - Social Media Links: ${data.trustSignals.hasSocialLinks}
        - About Us Page: ${data.trustSignals.hasAboutPage}
        - Live Chat: ${data.trustSignals.hasLiveChat}
        Calculated Trust Score: ${trustScore}/100
    `;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: model,
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
        runQuery(`INSERT INTO audits (id, url, status, report_data) VALUES ('${auditId}', '${url}', 'completed', '${dataStr}')`);

        res.json({ success: true, data: auditResult, id: auditId });
    } catch (error) {
        console.error("Audit failed:", error);
        res.status(500).json({ success: false, error: "Failed to perform audit" });
    }
});

app.get('/api/audits', async (req, res) => {
    try {
        const rows = runQuery(`SELECT id, url, status, created_at FROM audits ORDER BY created_at DESC LIMIT 50`);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Failed to list audits:", error);
        res.status(500).json({ error: "Failed to list audits" });
    }
});

app.get('/api/audit/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const rows = runQuery(`SELECT * FROM audits WHERE id = '${id}'`);
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

app.get('/api/report/:id/pdf', async (req, res) => {
    const { id } = req.params;
    let browser;
    try {
        const rows = runQuery(`SELECT * FROM audits WHERE id = '${id}'`);
        if (rows.length === 0) return res.status(404).json({ error: "Audit not found" });
        
        const audit = rows[0];
        if (audit.status !== 'completed') {
             return res.status(400).json({ error: "Report is not ready yet" });
        }

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new'
        });
        const page = await browser.newPage();
        
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        await page.goto(`${frontendUrl}/report/${id}`, {
            waitUntil: 'networkidle0',
        });

        // Add some CSS to hide elements we don't want in the PDF
        await page.addStyleTag({
            content: `
                nav, footer, button, .no-print { display: none !important; }
                main { padding-top: 0 !important; margin-top: 0 !important; width: 100% !important; max-width: 100% !important; }
                body { background: white !important; color: black !important; }
                .bg-slate-950 { background: white !important; }
                .text-slate-50 { color: black !important; }
                .bg-slate-900\\/50, .bg-slate-900\\/40, .bg-slate-950\\/50 { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
                .text-slate-400, .text-slate-300, .text-slate-500 { color: #64748b !important; }
                .text-white { color: black !important; }
                .border-slate-800 { border-color: #e2e8f0 !important; }
                .from-indigo-600\\/20 { background: #eef2ff !important; }
                .to-cyan-600\\/10 { background: #f0f9ff !important; }
                .text-indigo-400 { color: #4f46e5 !important; }
                .text-red-400 { color: #dc2626 !important; }
                .text-green-400 { color: #16a34a !important; }
                .bg-indigo-600 { background: #4f46e5 !important; color: white !important; }
                .shadow-2xl, .shadow-xl, .shadow-lg { shadow: none !important; }
            `
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            }
        });

        res.contentType("application/pdf");
        res.setHeader('Content-Disposition', `attachment; filename=AuditOwl-Report-${id}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF generation failed:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    } finally {
        if (browser) await browser.close();
    }
});

app.get('/api/admin/stats', async (req, res) => {
    // Simple protection via header for now (could be expanded)
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== (process.env.ADMIN_KEY || 'password123')) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const allAudits = runQuery(`SELECT id, status, report_data, url FROM audits`);
        let freeCount = 0;
        let paidCount = 0;
        let totalRevenue = 0;

        allAudits.forEach(audit => {
            let isFull = false;
            if (audit.report_data) {
                try {
                    const data = JSON.parse(audit.report_data);
                    if (data.isFullReport) isFull = true;
                } catch (e) {}
            }
            
            if (isFull || audit.status === 'paid') {
                paidCount++;
                totalRevenue += 19;
            } else if (audit.status === 'completed') {
                freeCount++;
            }
        });

        res.json({
            success: true,
            stats: {
                freeCount,
                paidCount,
                totalRevenue
            },
            recentAudits: allAudits.slice(-20).reverse() // Simple way for now
        });
    } catch (error) {
        console.error("Admin stats failed:", error);
        res.status(500).json({ error: "Failed to fetch admin stats" });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

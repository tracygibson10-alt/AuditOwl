require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { extractSiteData } = require('./audit');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

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
        res.json({ success: true, data: auditResult });
    } catch (error) {
        console.error("Audit failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

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
            healthScore: 72,
            summary: "Your site has a solid foundation but is missing key trust signals and has slow mobile load times.",
            cro: {
                valueProp: "Clear, but could be more benefit-driven.",
                ctaAudit: "CTA is visible but contrast could be improved.",
                trustSignals: "Missing testimonials and trust badges."
            },
            seo: {
                titleTag: "Good length, but lacks primary keyword.",
                metaDescription: "Present, but needs a stronger call to action.",
                h1Hierarchy: "Correct usage of H1."
            },
            performance: {
                score: 65,
                recommendations: ["Compress images", "Minify JS"]
            }
        };
    }

    const prompt = `
        You are an expert CRO and SEO auditor. Analyze the following website data and provide a structured JSON report.
        Follow this structure:
        {
            "healthScore": number (0-100),
            "summary": "Short executive summary",
            "cro": {
                "valueProp": "Analysis",
                "ctaAudit": "Analysis",
                "trustSignals": "Analysis"
            },
            "seo": {
                "titleTag": "Analysis",
                "metaDescription": "Analysis",
                "h1Hierarchy": "Analysis"
            },
            "performance": {
                "score": number,
                "recommendations": ["list", "of", "strings"]
            }
        }

        Website Data:
        URL: ${data.url}
        Title: ${data.title}
        Meta Description: ${data.metaDescription}
        Hero Text: ${data.heroText}
        H1s: ${data.h1s.join(', ')}
        CTAs: ${data.buttons.join(', ')}
        Load Time: ${data.performance.loadTimeMs}ms
        Images without Alt: ${data.imagesWithoutAlt}/${data.totalImages}
    `;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o",
            messages: [{ role: "system", content: "You are a helpful assistant that returns JSON." }, { role: "user", content: prompt }],
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

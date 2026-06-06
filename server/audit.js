const puppeteer = require('puppeteer');

async function extractSiteData(url) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    
    try {
        const startTime = Date.now();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const loadTime = Date.now() - startTime;

        const data = await page.evaluate(() => {
            const title = document.title;
            const metaDescription = document.querySelector('meta[name="description"]')?.content || "";
            
            // Hero section candidates: H1 or first large text
            const h1s = Array.from(document.querySelectorAll('h1')).map(el => el.innerText.trim());
            const heroText = h1s[0] || "";

            // CTAs
            const buttons = Array.from(document.querySelectorAll('button, a.btn, a.button')).map(el => el.innerText.trim()).filter(t => t.length > 0);
            const allLinks = Array.from(document.querySelectorAll('a')).map(el => el.innerText.trim()).filter(t => t.length > 0);

            // SEO Tags
            const h2s = Array.from(document.querySelectorAll('h2')).map(el => el.innerText.trim());
            const imagesWithoutAlt = Array.from(document.querySelectorAll('img')).filter(img => !img.alt).length;
            const totalImages = document.querySelectorAll('img').length;

            return {
                title,
                metaDescription,
                heroText,
                h1s,
                h2s,
                buttons,
                allLinks: allLinks.slice(0, 20), // Limit links
                imagesWithoutAlt,
                totalImages,
                url: window.location.href
            };
        });

        data.performance = {
            loadTimeMs: loadTime,
            isResponsive: await page.evaluate(() => window.innerWidth > 0) // Basic check
        };

        await browser.close();
        return data;
    } catch (error) {
        await browser.close();
        throw error;
    }
}

module.exports = { extractSiteData };

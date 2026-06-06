const puppeteer = require('puppeteer');

async function extractSiteData(url) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    
    // Set viewport for "above the fold" check
    await page.setViewport({ width: 1280, height: 800 });

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

            // CTAs - Check if any button or CTA-like link is in the initial viewport
            const isElementInViewport = (el) => {
                const rect = el.getBoundingClientRect();
                return (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                );
            };

            const allButtons = Array.from(document.querySelectorAll('button, a.btn, a.button, a')).filter(el => {
                const text = el.innerText.trim();
                return text.length > 0 && text.length < 30; // Filter for CTA-like links
            });

            const aboveFoldCTAs = allButtons.filter(isElementInViewport).map(el => el.innerText.trim());
            const hasAboveFoldCTA = aboveFoldCTAs.length > 0;

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
                hasAboveFoldCTA,
                aboveFoldCTAs,
                imagesWithoutAlt,
                totalImages,
                url: window.location.href
            };
        });

        data.performance = {
            loadTimeMs: loadTime,
            // Basic responsive check: change viewport and see if scrollWidth matches
            isResponsive: await page.evaluate(() => {
                const originalWidth = document.documentElement.scrollWidth;
                // This is a very basic heuristic
                return originalWidth <= window.innerWidth;
            })
        };

        await browser.close();
        return data;
    } catch (error) {
        await browser.close();
        throw error;
    }
}

module.exports = { extractSiteData };

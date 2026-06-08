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

            // Trust Signals Data Collection
            const links = Array.from(document.querySelectorAll('a'));
            const scripts = Array.from(document.querySelectorAll('script'));
            const iframes = Array.from(document.querySelectorAll('iframe'));
            const bodyText = document.body.innerText;
            const footer = document.querySelector('footer')?.innerText || "";
            const footerLinks = Array.from(document.querySelectorAll('footer a, .footer a, [class*="footer"] a'));

            const hasPhone = links.some(a => a.href.startsWith('tel:')) || 
                             /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(bodyText);
            
            const hasAddress = /itemtype="http:\/\/schema\.org\/PostalAddress"/i.test(document.documentElement.innerHTML) ||
                               /(Street|Ave|Road|Blvd|Drive|Way|Avenue|St\.|Rd\.)\s?.*?\d{5}/i.test(bodyText) ||
                               iframes.some(f => f.src.includes('google.com/maps'));

            const trustBadgeKeywords = ["bbb", "norton", "mcafee", "trusted", "secure", "verified"];
            const hasTrustBadges = Array.from(document.querySelectorAll('img, svg')).some(el => {
                const alt = (el.alt || "").toLowerCase();
                const src = (el.src || "").toLowerCase();
                return trustBadgeKeywords.some(kw => alt.includes(kw) || src.includes(kw));
            });

            const paymentKeywords = ["visa", "mastercard", "paypal", "stripe", "amex", "apple-pay", "google-pay"];
            const hasPaymentIcons = Array.from(document.querySelectorAll('img, svg, i')).some(el => {
                const alt = (el.alt || "").toLowerCase();
                const src = (el.src || "").toLowerCase();
                const cls = (el.className || "");
                return paymentKeywords.some(kw => alt.includes(kw) || src.includes(kw) || (typeof cls === 'string' && cls.toLowerCase().includes(kw)));
            });

            const reviewKeywords = ["testimonials", "reviews", "what our clients say"];
            const reviewScripts = ["trustpilot.com", "yotpo.com", "loox.io", "google.com/reviews"];
            const hasReviews = reviewKeywords.some(kw => bodyText.toLowerCase().includes(kw)) ||
                               scripts.some(s => reviewScripts.some(rs => s.src.includes(rs)));

            const hasRefundPolicy = footerLinks.some(a => {
                const txt = a.innerText.toLowerCase();
                return txt.includes("return policy") || txt.includes("refund policy") || txt.includes("money back guarantee");
            });

            const hasPrivacyPolicy = footerLinks.some(a => a.innerText.toLowerCase().includes("privacy policy"));
            const hasTerms = footerLinks.some(a => a.innerText.toLowerCase().includes("terms"));

            const socialDomains = ["facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com"];
            const hasSocialLinks = links.some(a => socialDomains.some(domain => a.href.includes(domain)));

            const aboutKeywords = ["about us", "our story", "meet the team", "about"];
            const hasAboutPage = links.some(a => aboutKeywords.some(kw => a.innerText.toLowerCase().trim() === kw));

            const chatScripts = ["intercom.io", "zendesk.com", "crisp.chat", "drift.com", "tawk.to", "whatsapp"];
            const hasLiveChat = scripts.some(s => chatScripts.some(cs => s.src.includes(cs))) ||
                                links.some(a => a.href.includes("wa.me"));

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
                url: window.location.href,
                trustSignals: {
                    hasSSL: window.location.protocol === 'https:',
                    hasPhone,
                    hasAddress,
                    hasTrustBadges,
                    hasPaymentIcons,
                    hasReviews,
                    hasRefundPolicy,
                    hasPrivacyPolicy,
                    hasTerms,
                    hasSocialLinks,
                    hasAboutPage,
                    hasLiveChat
                }
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

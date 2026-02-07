import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

// Helper to wait
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

(async () => {
    console.log('Starting E2E Test...');
    const browser = await puppeteer.launch({
        headless: "new", // Use new headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        // 1. Load Dashboard
        console.log('Navigating to Dashboard...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

        // Check if we are on the dashboard
        const title = await page.title();
        console.log(`Page Title: ${title}`);

        // 2. Add Stock
        const testTicker = 'MSFT'; // Microsoft
        console.log(`Adding stock: ${testTicker}...`);

        await page.waitForSelector('[data-testid="ticker-input"]');
        // Ensure clear
        await page.evaluate(() => {
            document.querySelector('[data-testid="ticker-input"]').value = '';
            document.querySelector('[data-testid="quantity-input"]').value = '';
        });

        await page.type('[data-testid="ticker-input"]', testTicker);
        await page.type('[data-testid="quantity-input"]', '10');

        await Promise.all([
            // Wait for the list to update
            page.waitForSelector(`[data-testid="holding-item-${testTicker}"]`, { timeout: 15000 }),
            page.click('[data-testid="add-stock-button"]')
        ]);
        console.log('Stock added successfully.');

        // 3. Delete from Dashboard
        console.log('Testing delete from Dashboard...');

        // Setup dialog listener
        page.on('dialog', async dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept();
        });

        await page.click(`[data-testid="delete-button-${testTicker}"]`);

        // Wait for it to disappear
        await page.waitForSelector(`[data-testid="holding-item-${testTicker}"]`, { hidden: true, timeout: 15000 });
        console.log('Stock deleted from Dashboard successfully.');

        // 4. Test Delete from Details Page
        const detailTicker = 'NVDA';
        console.log(`Adding ${detailTicker} for detail view test...`);

        // Wait a bit to avoid potential throttling just in case
        await delay(2000);

        // Ensure clear again
        await page.evaluate(() => {
            document.querySelector('[data-testid="ticker-input"]').value = '';
            document.querySelector('[data-testid="quantity-input"]').value = '';
        });

        await page.type('[data-testid="ticker-input"]', detailTicker);
        await page.type('[data-testid="quantity-input"]', '5');
        await page.click('[data-testid="add-stock-button"]');

        console.log('Waiting for NVDA holding item...');
        await page.waitForSelector(`[data-testid="holding-item-${detailTicker}"]`, { timeout: 20000 });

        console.log('Navigating to details page...');
        await page.click(`[data-testid="holding-item-${detailTicker}"]`);

        await page.waitForSelector('[data-testid="detail-delete-button"]', { timeout: 15000 });
        console.log('On details page. Clicking delete...');

        await Promise.all([
            page.waitForNavigation({ timeout: 15000 }), // Expect redirect
            page.click('[data-testid="detail-delete-button"]')
        ]);

        // Check if back on dashboard and item is gone
        const url = page.url();
        console.log(`Current URL: ${url}`);
        if (!url.endsWith('/')) {
            throw new Error('Did not redirect to dashboard');
        }

        await page.waitForSelector(`[data-testid="holding-item-${detailTicker}"]`, { hidden: true, timeout: 15000 });
        console.log('Stock deleted from Details page successfully.');

        console.log('ALL TESTS PASSED');

    } catch (error) {
        console.error('Test Failed:', error);
        try {
            const errorMsg = await page.$eval('[style*="color: var(--accent-red)"]', el => el.textContent).catch(() => null);
            if (errorMsg) console.log('Visible Error Message:', errorMsg);

            await page.screenshot({ path: 'test-failure.png' });
            console.log('Screenshot saved to test-failure.png');
        } catch (e) {
            console.error('Failed to capture diagnostics:', e);
        }
        process.exit(1);
    } finally {
        await browser.close();
    }
})();

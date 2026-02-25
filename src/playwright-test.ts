import { chromium } from 'playwright';

(async () => {
	console.log('Launching Playwright');
	const path = chromium.executablePath();
	console.log('Path:', path);

	console.log('Launching browser');
	const browser = await chromium.launch({ headless: false });
	console.log('Browser launched', !!browser);
	const page = await browser.newPage();

	await page.goto('https://www.google.com');
	console.log('Page loaded');

	await browser.close();
})();
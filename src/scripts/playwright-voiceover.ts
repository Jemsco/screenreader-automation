import { voiceOver } from "@guidepup/guidepup";
import { chromium, type Page } from "playwright";
import { getActionableElements } from "../core/getActionableElements.js";

type Mode = "all" | "actionable";
const url = "http://127.0.0.1:5500/src/pages/test-page.html";

const mode: Mode = process.argv.includes("--mode=all") ? "all" : "actionable";
console.log("Mode:", mode);
console.log("Arguments:", process.argv);

function isActionable(domInfo: any): boolean {
	if (!domInfo) return false;
	if (domInfo.tabindex === "-1") return false;

	const actionableTags = new Set([
		"a",
		"button",
		"input",
		"select",
		"textarea"
	]);

	if (actionableTags.has(domInfo.tag)) return true;

	const actionableRoles = new Set([
		"button",
		"link",
		"checkbox",
		"radio",
		"switch",
		"textBox",
		"tab",
		"menuitem"
	]);
	if (actionableRoles.has(domInfo.role)) return true;

	return false;
}

async function getDomInfo(page: Page) {
	return page.evaluate(() => {
		const el = document.activeElement;
		if (!el) return null;

		return {
			tag: el.tagName.toLowerCase(),
			role: el.getAttribute("role"),
			type: el.getAttribute("type"),
			tabindex: el.getAttribute("tabindex")
		};
	});
}

async function waitForVoiceOver(
	stableMs = 2000,
	pollMs = 100,
	timeoutMs = 10000
): Promise<string> {
	let last = "";
	let stableFor = 0;
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const current = (await voiceOver.lastSpokenPhrase()) ?? "";
		if (current !== last) {
			stableFor = 0;
			last = current;
		} else {
			stableFor += pollMs;
		}
		if (stableFor >= stableMs) {
			return last;
		}
		await new Promise((resolve) => setTimeout(resolve, pollMs));
	}
	return last;
}

(async () => {
	// Start VoiceOver.
	console.log("Launching Playwright");
	// const path = chromium.executablePath();
	// console.log('Path:', path);
	const browser = await chromium.launch({ headless: false });
	console.log('Browser launched', !!browser);

	const page = await browser.newPage();
	await page.goto(url, { waitUntil: "networkidle" });
	// await page.waitForLoadState("domcontentloaded");
	await page.waitForTimeout(1000);
	console.log('Page loaded');

	console.log("Starting VoiceOver");
	await voiceOver.start();

	const elements = await getActionableElements(page);
	console.log(`Found ${elements.length} actionable elements on the page.`);

	for (const element of elements) {
		console.log('Element:', await element.evaluate((el) => (el as HTMLElement).tagName), await element.evaluate((el) => (el as HTMLElement).role));
	}

	await page.bringToFront();
	// await page.click('body');
	await page.keyboard.press('Tab');
	// await page.evaluate(() => document.body.focus());
	await elements[0]?.focus();
	await voiceOver.perform(voiceOver.commanderCommands.MOVE_VOICEOVER_CURSOR_TO_KEYBOARD_FOCUS);

	for (const element of elements) {
		const stableAnnounced = await waitForVoiceOver();

		// Try reading the announced text; fallback to lastSpokenPhrase
		let itemText = await voiceOver.itemText();
		let announced = stableAnnounced;
		const domInfo = await getDomInfo(page);

		if (mode === "all") {
			console.log({
				itemText, announced,
				domInfo
			});
			continue;
		}
		if (mode === "actionable" && isActionable(domInfo)) {
			console.log({
				itemText, announced,
				domInfo
			});
		}

		await page.keyboard.press('Tab');
		await voiceOver.perform(voiceOver.commanderCommands.MOVE_VOICEOVER_CURSOR_TO_KEYBOARD_FOCUS);
	}
	await voiceOver.stop();

	await browser.close();
	console.log("Playwright closed");
})();
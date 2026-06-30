import { voiceOver } from "@guidepup/guidepup";
import { chromium, type Page } from "playwright";
import { getActionableElements } from "../core/getActionableElements.js";
import { VoiceOverReader } from "../core/screenreaders/voiceOverReader.js";
import { scanPage } from "../core/scanner.js";

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
    "textarea",
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
    "menuitem",
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
      tabindex: el.getAttribute("tabindex"),
    };
  });
}

(async () => {
  // Start VoiceOver.
  console.log("Launching Playwright");

  const browser = await chromium.launch({ headless: false });
  console.log("Browser launched", !!browser);

  const page = await browser.newPage();
  // ensure the page has the desired dimensions
  await page.setViewportSize({ width: 650, height: 698 });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  console.log("Page loaded");

  console.log("Starting VoiceOver");
  const reader = new VoiceOverReader();
  const elements = await getActionableElements(page);
  console.log(`Found ${elements.length} actionable elements on the page.`);

  for (const element of elements) {
    console.log(
      "Element:",
      await element.evaluate((el) => (el as HTMLElement).tagName),
      await element.evaluate((el) => (el as HTMLElement).role),
    );
  }

  const scanResults = await scanPage(page, reader, {
    async onResult(result) {
      const itemText = await voiceOver.itemText();
      const domInfo = await getDomInfo(page);

      if (mode === "all") {
        console.log(result);
        return;
      }
      if (mode === "actionable" && isActionable(domInfo)) {
        console.log(result);
      }
    },
  });

  if (scanResults.length === 0) {
    console.log("No actionable elements were scanned.");
  }

  await browser.close();
  console.log("Playwright closed");
})();

import { chromium, type ElementHandle, type Page } from "playwright";
import { getActionableElements } from "./getActionableElements.js";
import { scanPage } from "./scanner.js";
import { createSnapshotFile, writeSnapshotFile } from "./snapshotWriter.js";
import { getDomInfo, isActionableDomInfo } from "./screenReaderUtils.js";
import type { RunScreenReaderScriptOptions } from "./models.js";
import { compareSnapshotFiles } from "./snapshotComparer.js";
import { type SnapshotElement } from "./models.js";

export async function runScreenReaderScript(
  options: RunScreenReaderScriptOptions,
): Promise<void> {
  if (options.comparePaths) {
    const [fileA, fileB] = options.comparePaths;
    const comparison = compareSnapshotFiles(fileA, fileB);

    console.log("\n══════════════════════════════════════════");
    console.log(" SNAPSHOT DIFF");
    console.log(`  Baseline : ${fileA}  (${comparison.snapshotA.timestamp})`);
    console.log(`  Current  : ${fileB}  (${comparison.snapshotB.timestamp})`);
    console.log("══════════════════════════════════════════\n");

    for (const line of comparison.lines) {
      console.log(line);
    }

    if (comparison.differences === 0) {
      console.log("✅  No differences found.");
    } else {
      console.log(`⚠️   ${comparison.differences} difference(s) found.`);
      process.exit(1);
    }
    process.exit(0);
  }

  console.log("Launching Playwright");
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 650, height: 698 });
  await page.goto(options.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  console.log("Page loaded");

  console.log(`Starting ${options.screenReaderName}`);
  const results: SnapshotElement[] = [];

  try {
    if (options.elementSelector) {
      console.log(`Targeting element: ${options.elementSelector}`);
      const el = page.locator(options.elementSelector).first();

      await el.focus();
      await options.reader.moveToFocus();

      const announced = await options.reader.waitForAnnouncement();
      const itemText = await options.reader.itemText();
      const domInfo = await (options.getDomInfo ?? getDomInfo)(page);

      const result: SnapshotElement = {
        selector: options.elementSelector,
        index: 0,
        itemText,
        announced,
        screenReader: options.screenReaderName,
        domInfo,
      };

      console.log(result);
      results.push(result);
    } else {
      const elements = await getActionableElements(page);
      console.log(`Found ${elements.length} actionable elements on the page.`);

      const scanResults = await scanPage(page, options.reader, {
        async onResult(result) {
          const domInfo = await (options.getDomInfo ?? getDomInfo)(page);
          const selector = options.getSelectorKey
            ? await options.getSelectorKey(result.element, result.index)
            : result.tag;

          const snapshotResult: SnapshotElement = {
            selector,
            index: result.index,
            itemText: result.itemText,
            announced: result.announcement,
            screenReader: options.screenReaderName,
            domInfo,
          };

          if (
            options.mode === "all" ||
            (options.mode === "actionable" &&
              (options.isActionable ?? isActionableDomInfo)(domInfo))
          ) {
            console.log(snapshotResult);
            results.push(snapshotResult);
          }
        },
      });

      if (scanResults.length === 0) {
        console.log("No actionable elements were scanned.");
      }
    }
  } finally {
    await browser.close();
    console.log("Playwright closed");
  }

  if (options.snapshotPath) {
    const snapshot = createSnapshotFile({
      url: options.url,
      mode: options.mode,
      element: options.elementSelector,
      screenReader: options.screenReaderName,
      results,
    });
    writeSnapshotFile(options.snapshotPath, snapshot);
    console.log(`\nSnapshot saved → ${options.snapshotPath}`);
  }
}

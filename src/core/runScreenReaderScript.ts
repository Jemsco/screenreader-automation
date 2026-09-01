import { chromium, type ElementHandle, type Page } from "playwright";
import { createInterface } from "node:readline/promises";
import { getActionableElements } from "./getActionableElements.js";
import { scanPage } from "./scanner.js";
import { createSnapshotFile, writeSnapshotFile } from "./snapshotWriter.js";
import { getDomInfo, isActionableDomInfo } from "./screenReaderUtils.js";
import type { RunScreenReaderScriptOptions } from "./models.js";
import { compareSnapshotFiles } from "./snapshotComparer.js";
import { type SnapshotElement } from "./models.js";
import type { ScreenReader } from "./screenreaders/screenReader.js";
import { withTimeout } from "./async.js";
import { FOCUS_TIMEOUT_MS } from "./scanner.js";

export async function runScreenReaderScript(
  options: RunScreenReaderScriptOptions,
): Promise<void> {
  if (options.comparePaths) {
    const [fileA, fileB] = options.comparePaths;
    const comparison = compareSnapshotFiles(fileA, fileB);

    console.log("\n══════════════════════════════════════════");
    console.log(" SNAPSHOT DIFF");
    console.log(`  Baseline : ${fileA}  (${comparison.snapshotA.timestamp})`);
    console.log(`  Current  : ${fileB}  (${comparison.snapshotB.timestamp})`);
    console.log("══════════════════════════════════════════\n");

    for (const line of comparison.lines) {
      console.log(line);
    }

    if (comparison.differences === 0) {
      console.log("✅  No differences found.");
    } else {
      console.log(`⚠️   ${comparison.differences} difference(s) found.`);
      process.exit(1);
    }
    process.exit(0);
  }

  console.log("Launching Playwright");
  const browser = await chromium.launch({ headless: false });
  const results: SnapshotElement[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 650, height: 698 });
    await page.goto(options.url, { waitUntil: "networkidle" }); // await page.waitForTimeout(1000);

    if (options.waitForSelector) {
      console.log(`Waiting for selector: ${options.waitForSelector}`);
      await page.waitForSelector(options.waitForSelector);
      console.log("Selector found");
    }

    if (options.pause) {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      await rl.question("Press Enter to continue...");
      rl.close();
    }

    console.log(`Starting ${options.screenReaderName}`);

    await options.reader.start();
    if (options.elementSelector) {
      console.log(`Targeting element: ${options.elementSelector}`);
      const el = page.locator(options.elementSelector).first();
      const elementHandle = await el.elementHandle();

      if (!elementHandle) {
        throw new Error(`Element not found: ${options.elementSelector}`);
      } // Enumerate every focusable element in DOM (tab) order, then locate the
      // target's real position within it. focusElement derives its Tab budget
      // (elements.length + 1) and its radio-group fallback (index > 0) from
      // this list — so passing the full ordering, not just [target], is what
      // lets NVDA actually Tab all the way to elements past the first stop.
      const focusable = await getActionableElements(page);
      let targetIndex = -1;
      for (let i = 0; i < focusable.length; i++) {
        const isSame = await page.evaluate(([a, b]) => a === b, [
          focusable[i],
          elementHandle,
        ] as const);
        if (isSame) {
          targetIndex = i;
          break;
        }
      } // Fall back to the located handle alone if the selector points at
      // something outside the actionable set. maxPresses stays small here,
      // but that only affects unusual selectors — the common case above has
      // the full budget.
      const elements = targetIndex >= 0 ? focusable : [elementHandle];
      const index = targetIndex >= 0 ? targetIndex : 0;

      await page.bringToFront();
      await page.waitForTimeout(300); // Reset to body first so Tab navigation starts from a known position

      await page.evaluate(() => document.body.focus());
      await page.waitForTimeout(100); // Navigate to the element via real keypresses so NVDA tracks focus

      const focused = await withTimeout(
        options.reader.focusElement(page, elementHandle, index, elements),
        FOCUS_TIMEOUT_MS,
        false,
      );

      if (!focused) {
        throw new Error(`Could not focus element: ${options.elementSelector}`);
      } // Clear accumulated navigation speech, then re-announce cleanly

      await options.reader.clearLog();
      await options.reader.describeItemWithKeyboardFocus();

      const announced = await options.reader.normalizeAnnouncement(
        await options.reader.waitForAnnouncement(),
      );
      const itemText = await options.reader.normalizeAnnouncement(
        await options.reader.itemText(),
      );
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
    await options.reader.stop();
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

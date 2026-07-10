import { getActionableElements } from "./getActionableElements.js";
import type { Page } from "playwright";
import { getElementInfo } from "./getElementInfo.js";
import type { ScreenReader } from "./screenreaders/screenReader.js";
import type { ScanResult } from "./models.js";

const start = performance.now();

function log(message: string) {
  const elapsed = (performance.now() - start).toFixed(0);
  console.log(`[${elapsed} ms] ${message}`);
}

export interface ScanPageOptions {
  onResult?: (result: ScanResult) => Promise<void> | void;
}

export async function scanPage(
  page: Page,
  reader: ScreenReader,
  options: ScanPageOptions = {},
): Promise<ScanResult[]> {
  try {
    const elements = await getActionableElements(page);
    const results: ScanResult[] = [];
    await page.bringToFront();
    // await elements[0]?.focus();
    // await reader.moveToFocus();
    log("IN TRY BLOCK and before FOR LOOP");

    for (const [index, element] of elements.entries()) {
      log("IN FOR LOOP");
      await reader.clearLog();
      // await reader.moveToFocus();

      await page.evaluate((el) => {
        (el as HTMLElement).focus();
      }, element);

      await page.waitForFunction((e) => document.activeElement === e, element);
      await page.waitForTimeout(100);

      const announcement = await reader.waitForAnnouncement();
      const itemText = await reader.itemText();
      const info = await getElementInfo(element);
      const result: ScanResult = {
        index,
        element,
        tag: info.tag,
        role: info.role,
        type: info.type,
        text: info.text,
        announcement,
        itemText,
      };
      results.push(result);

      if (options.onResult) {
        await options.onResult(result);
      }
    }

    return results;
  } catch (error) {
    console.error("Error scanning page:", error);
    throw error;
  }
}

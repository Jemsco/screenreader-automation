import { getActionableElements } from "./getActionableElements.js";
import type { Page } from "playwright";
import { getElementInfo } from "./getElementInfo.js";
import type { ScreenReader } from "./screenreaders/screenReader.js";
import type { ScanResult } from "./models.js";
import { log } from "./logs.js";
import { withTimeout } from "./async.js";

export interface ScanPageOptions {
  onResult?: (result: ScanResult) => Promise<void> | void;
}

export const FOCUS_TIMEOUT_MS = 8000;

export async function scanPage(
  page: Page,
  reader: ScreenReader,
  options: ScanPageOptions = {},
): Promise<ScanResult[]> {
  try {
    const elements = await getActionableElements(page);
    const results: ScanResult[] = [];
    await page.bringToFront();
    await page.waitForTimeout(300);

    for (const [index, element] of elements.entries()) {
      await reader.clearLog();
      const focused = await withTimeout(
        reader.focusElement(page, element, index, elements),
        FOCUS_TIMEOUT_MS,
        false,
      );

      if (!focused) {
        log(`Could not focus element ${index}`);
        continue;
      }

      await page.waitForTimeout(100);
      await reader.describeItemWithKeyboardFocus();

      let announcement = await reader.waitForAnnouncement();
      announcement = await reader.normalizeAnnouncement(announcement);
      await page.waitForTimeout(2000);
      const itemText = await reader.normalizeAnnouncement(
        await reader.itemText(),
      );

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

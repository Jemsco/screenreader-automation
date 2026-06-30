import { getActionableElements } from "./getActionableElements.js";
import type { Page } from "playwright";
import { getElementInfo } from "./getElementInfo.js";
import type { ScreenReader } from "./screenreaders/screenReader.js";

export interface ScanResult {
  index: number;
  tag: string;
  role: string | null;
  type: string | null;
  text: string;
  announcement: string;
  itemText: string;
}

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
  await reader.start();

  try {
    const elements = await getActionableElements(page);
    const results: ScanResult[] = [];
    await page.bringToFront();
    await elements[0]?.focus();
    await reader.moveToFocus();

    for (const [index, element] of elements.entries()) {
      const text = await element.textContent();

      log(`Focusing ${text}`);

      // await reader.clearLog();

      await page.evaluate((el) => {
        (el as HTMLElement).focus();
      }, element);

      await page.waitForFunction((e) => document.activeElement === e, element);

      const announcement = await reader.waitForAnnouncement();
      const itemText = await reader.itemText();
      const info = await getElementInfo(element);
      const result: ScanResult = {
        index,
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
      await reader.moveToFocus();
    }

    return results;
  } finally {
    await reader.stop();
  }
}

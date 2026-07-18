import { nvda } from "@guidepup/guidepup";
import type { ScreenReader } from "./screenReader.js";
import type { ElementHandle, Page } from "playwright";

export class NvdaReader implements ScreenReader {
  async start(): Promise<void> {
    await nvda.start();
    // console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(nvda)));
    // console.log(Object.keys(nvda.keyboardCommands));
  }

  async clearLog(): Promise<void> {
    // await nvda.clearItemTextLog();
    await nvda.clearSpokenPhraseLog();
  }

  /**
   * Moves focus onto `target` using real Tab keypresses rather than a
   * JS-driven `element.focus()` call.
   *
   * Screen readers (NVDA in particular) can fail to recognize a focus
   * change that's triggered programmatically via JavaScript, since it
   * doesn't go through the OS's normal input pipeline the way a real
   * Tab keypress does. Driving focus with actual keystrokes ensures
   * NVDA (and VoiceOver) reliably detect the change and announce the
   * newly focused element correctly.
   *
   * Assumes `target` is reachable via forward Tab order from the
   * current focus position. Returns true if focus successfully landed
   * on `target`, false if it gave up after `maxPresses`.
   */
  async focusElementViaTab(
    page: Page,
    target: ElementHandle,
    maxPresses = 10,
  ): Promise<boolean> {
    for (let i = 0; i < maxPresses; i++) {
      const isFocused = await page.evaluate(
        (el) => document.activeElement === el,
        target,
      );

      if (isFocused) {
        return true;
      }

      await this.press("Tab");
      await page.waitForTimeout(100);
    }

    return false;
  }

  async syncCursor(): Promise<string> {
    // await nvda.perform(nvda.keyboardCommands.moveToFocusObject);
    // return (await nvda.lastSpokenPhrase()) ?? "";
    return "";
  }

  async waitForAnnouncement(): Promise<string> {
    const timeoutMs = 8000;
    const pollMs = 100;
    const debounceMs = 600;
    const initialDelayMs = 1000;

    await new Promise((r) => setTimeout(r, initialDelayMs));

    const started = Date.now();
    let lastLength = 0;
    let stableSince: number | null = null;

    while (Date.now() - started < timeoutMs) {
      const phraseLog = await nvda.spokenPhraseLog();

      if (phraseLog.length !== lastLength) {
        lastLength = phraseLog.length;
        stableSince = Date.now();
      } else if (phraseLog.length > 0 && stableSince !== null) {
        if (Date.now() - stableSince >= debounceMs) {
          const meaningful = phraseLog.filter((p) => {
            const t = p.trim().toLowerCase();
            if (t === "") return false;
            if (t === "dash") return false;
            // Filter NVDA context announcements — these are navigation
            // breadcrumbs, not descriptions of the focused element
            if (t.includes("landmark")) return false;
            if (t.includes("heading")) return false;
            if (t.includes("grouping")) return false;
            if (t.includes("region")) return false;
            // Filter character-by-character spelling
            if (/^[a-z](, (space|[a-z]))*$/.test(t)) return false;
            return true;
          });

          return meaningful[meaningful.length - 1] ?? "";
        }
      }

      await new Promise((r) => setTimeout(r, pollMs));
    }

    return "";
  }

  async focusElement(page: Page, target: ElementHandle): Promise<boolean> {
    // First try normal Tab navigation
    const focused = await this.focusElementViaTab(page, target);

    if (focused) {
      await this.clearLog();
      return true;
    }

    // NVDA recovery path
    await this.press("ArrowDown");
    await page.waitForTimeout(300);

    await page.evaluate((el) => {
      (el as HTMLElement).focus();
    }, target);

    await page.waitForFunction((e) => document.activeElement === e, target);

    await this.clearLog();
    return true;
  }

  async press(key: string): Promise<void> {
    await nvda.press(key);
  }

  async itemText(): Promise<string> {
    return (await nvda.itemText()) ?? "";
  }

  async clearItemTextLog(): Promise<void> {
    // await nvda.clearItemTextLog();
    await nvda.clearSpokenPhraseLog();
  }

  async describeItemWithKeyboardFocus(): Promise<void> {
    await nvda.perform(nvda.keyboardCommands.reportCurrentFocus);
  }

  async normalizeAnnouncement(text: string): Promise<string> {
    return text;
  }

  async stop(): Promise<void> {
    await nvda.stop();
  }
}

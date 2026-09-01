import { voiceOver } from "@guidepup/guidepup";
import type { ScreenReader } from "./screenReader.js";
import type { ElementHandle, Page } from "playwright";

export class VoiceOverReader implements ScreenReader {
  async start(): Promise<void> {
    await voiceOver.start();
  }

  async clearLog(): Promise<void> {
    await voiceOver.clearSpokenPhraseLog();
  }

  async perform(
    command: Parameters<typeof voiceOver.perform>[0],
  ): Promise<void> {
    await voiceOver.perform(command);
  }

  async describeItemWithKeyboardFocus(): Promise<void> {
    await this.perform(
      voiceOver.commanderCommands.DESCRIBE_ITEM_WITH_KEYBOARD_FOCUS,
    );
  }

  async normalizeAnnouncement(text: string): Promise<string> {
    return text.replace(/^Google Chrome.*?window\s+/, "").trim();
  }
  // TODO: adjust the pollMs length for duplicate announcemets or stutters
  // There may be a better way to do this.
  // TODO: adjust the timeoutMs length for slower devices
  async waitForAnnouncement(): Promise<string> {
    const timeoutMs = 3000;
    const pollMs = 50;

    const started = Date.now();
    let previous = "";
    let stableCount = 0;

    while (Date.now() - started < timeoutMs) {
      const phraseLog = await voiceOver.spokenPhraseLog();
      const current = phraseLog.join(" ").trim();

      if (current.length > 0) {
        if (current === previous) {
          stableCount++;
        } else {
          stableCount = 0;
          previous = current;
        }

        // Speech has not changed for 3 polling cycles (~300ms)
        if (stableCount >= 3) {
          return current;
        }
      }

      await new Promise((r) => setTimeout(r, pollMs));
    }

    return previous;
  }

  async itemText(): Promise<string> {
    return (await voiceOver.lastSpokenPhrase()) ?? "";
  }
  async clearItemTextLog(): Promise<void> {
    await voiceOver.clearItemTextLog();
  }

  async stop(): Promise<void> {
    await voiceOver.stop();
  }
  async focusElement(
    page: Page,
    element: ElementHandle,
    _index: number,
    _elements: ElementHandle[],
  ): Promise<boolean> {
    await page.evaluate((el) => (el as HTMLElement).focus(), element);

    await page.waitForFunction((e) => document.activeElement === e, element);

    return true;
  }
  async press(key: string): Promise<void> {
    await voiceOver.press(key);
  }
}

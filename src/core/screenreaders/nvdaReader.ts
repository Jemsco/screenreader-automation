import { nvda } from "@guidepup/guidepup";
import type { ScreenReader } from "./screenReader.js";

export class NvdaReader implements ScreenReader {
  async start(): Promise<void> {
    await nvda.start();
  }

  async clearLog(): Promise<void> {
    // NVDA does not expose a clear log API in the same way as VoiceOver.
  }

  async syncVoiceOverCursor(): Promise<string> {
    await nvda.perform(nvda.keyboardCommands.moveToFocusObject);
    return (await nvda.lastSpokenPhrase()) ?? "";
  }

  async waitForAnnouncement(): Promise<string> {
    return (await nvda.lastSpokenPhrase()) ?? "";
  }

  async itemText(): Promise<string> {
    return (await nvda.itemText()) ?? "";
  }

  async clearItemTextLog(): Promise<void> {
    await nvda.clearItemTextLog();
  }

  async describeItemWithKeyboardFocus(): Promise<void> {
    await nvda.perform(nvda.keyboardCommands.moveToFocusObject);
  }

  async normalizeVoiceOverAnnouncement(text: string): Promise<string> {
    return text;
  }

  async stop(): Promise<void> {
    await nvda.stop();
  }
}

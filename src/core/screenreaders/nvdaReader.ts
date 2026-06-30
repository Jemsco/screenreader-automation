import { nvda } from "@guidepup/guidepup";
import type { ScreenReader } from "./screenReader.js";

export class NvdaReader implements ScreenReader {
  async start(): Promise<void> {
    await nvda.start();
  }

  async moveToFocus(): Promise<void> {
    await nvda.perform(nvda.keyboardCommands.moveToFocusObject);
  }

  async getAnnouncement(): Promise<string> {
    return (await nvda.lastSpokenPhrase()) ?? "";
  }

  async stop(): Promise<void> {
    await nvda.stop();
  }
}

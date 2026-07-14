import { voiceOver } from "@guidepup/guidepup";
import type { ScreenReader } from "./screenReader.js";

const start = performance.now();

function log(message: string) {
  const elapsed = (performance.now() - start).toFixed(0);
  console.log(`[${elapsed} ms] ${message}`);
}

export class VoiceOverReader implements ScreenReader {
  async start(): Promise<void> {
    await voiceOver.start();
    // console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(voiceOver)));
    // console.log(Object.keys(voiceOver.commanderCommands));
  }

  async clearLog(): Promise<void> {
    await voiceOver.clearSpokenPhraseLog();
  }

  async perform(
    command: Parameters<typeof voiceOver.perform>[0],
  ): Promise<void> {
    await voiceOver.perform(command);
  }

  async syncVoiceOverCursor(): Promise<string> {
    const start = Date.now();

    log(`moveToFocus START ${start}`);
    await voiceOver.clearSpokenPhraseLog();
    log(`clearSpokenPhraseLog completed ${Date.now() - start}ms`);

    await this.perform(
      voiceOver.commanderCommands.MOVE_VOICEOVER_CURSOR_TO_KEYBOARD_FOCUS,
    );

    return "";
  }

  async describeItemWithKeyboardFocus(): Promise<void> {
    await this.perform(
      voiceOver.commanderCommands.DESCRIBE_ITEM_WITH_KEYBOARD_FOCUS,
    );
  }

  async normalizeVoiceOverAnnouncement(text: string): Promise<string> {
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
          log(`Speech stabilized: ${current}`);
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
}

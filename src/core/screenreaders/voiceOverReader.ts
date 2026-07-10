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

  async moveToFocus(): Promise<string> {
    const start = Date.now();

    log(`moveToFocus START ${start}`);
    await voiceOver.clearSpokenPhraseLog();
    log(`clearSpokenPhraseLog completed ${Date.now() - start}ms`);

    // await voiceOver.perform(
    //   voiceOver.commanderCommands.MOVE_VOICEOVER_CURSOR_TO_KEYBOARD_FOCUS,
    // );
    await this.perform(
      voiceOver.commanderCommands.MOVE_VOICEOVER_CURSOR_TO_KEYBOARD_FOCUS,
    );

    return "";
  }

  // TODO: adjust the pollMs length for duplicate announcemets or stutters
  // There may be a better way to do this.
  // TODO: adjust the timeoutMs length for slower devices
  async waitForAnnouncement(): Promise<string> {
    const timeoutMs = 3000;
    const pollMs = 50;
    const started = Date.now();
    let previous = "";

    while (Date.now() - started < timeoutMs) {
      const phraseLog = await voiceOver.spokenPhraseLog();
      const current = phraseLog.join(" ").trim();
      if (phraseLog.length > 0) {
        // await new Promise((r) => setTimeout(r, pollMs));
        // const finalLog = await voiceOver.spokenPhraseLog();
        // log(`finalLog: ${finalLog.join(" ").trim()}`);
        // return finalLog.join(" ").trim();
        const result = current;
        log(`Announcement captured: ${result}`);
        if (current && current !== previous) {
          previous = current;

          //   await new Promise((r) => setTimeout(r, 300));
          // return result;
          const finalLog = await voiceOver.spokenPhraseLog();
          const final = finalLog.join(" ").trim();

          log(`Final announcement: ${final}`);

          return final;
        }

        await new Promise((r) => setTimeout(r, 50));
      }
      // log(`Waiting in WhileLOop... ${Date.now() - started} ms elapsed`);
      // await new Promise((r) => setTimeout(r, 3000));
      // await new Promise((r) => setTimeout(r, pollMs));
    }
    return "";
    // return (await voiceOver.lastSpokenPhrase()) ?? "";
  }

  async itemText(): Promise<string> {
    return (await voiceOver.lastSpokenPhrase()) ?? "";
  }

  async stop(): Promise<void> {
    await voiceOver.stop();
  }
}

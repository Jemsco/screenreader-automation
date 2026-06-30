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
  }

  async clearLog(): Promise<void> {
    await voiceOver.clearSpokenPhraseLog();
  }

  async moveToFocus(): Promise<string> {
    await voiceOver.clearSpokenPhraseLog();
    await voiceOver.perform(
      voiceOver.commanderCommands.MOVE_VOICEOVER_CURSOR_TO_KEYBOARD_FOCUS,
    );
    log("voiceOver.perform(MOVE_VOICEOVER_CURSOR_TO_KEYBOARD_FOCUS)");
    const phraseLog = await voiceOver.spokenPhraseLog();

    log(`Moved to focus: ${phraseLog.join(" ").trim()}`);
    return phraseLog.join(" ").trim();
  }

  // TODO: adjust the pollMs length for duplicate announcemets or stutters
  // There may be a better way to do this.
  // TODO: adjust the timeoutMs length for slower devices
  async waitForAnnouncement(): Promise<string> {
    // const timeoutMs = 500;
    // const pollMs = 0.01;
    // const started = Date.now();

    // while (Date.now() - started < timeoutMs) {
    // const phraseLog = await voiceOver.spokenPhraseLog();
    // if (phraseLog.length > 0) {
    //   await new Promise((r) => setTimeout(r, pollMs));
    //   const finalLog = await voiceOver.spokenPhraseLog();
    //   log(`finalLog: ${finalLog.join(" ").trim()}`);
    //   return finalLog.join(" ").trim();
    // }
    // log(`Waiting in WhileLOop... ${Date.now() - started} ms elapsed`);
    // await new Promise((r) => setTimeout(r, 3000));
    // }
    // return "";
    return (await voiceOver.lastSpokenPhrase()) ?? "";
  }

  async itemText(): Promise<string> {
    return (await voiceOver.lastSpokenPhrase()) ?? "";
  }

  async stop(): Promise<void> {
    await voiceOver.stop();
  }
}

import { parseCliArgs } from "./cli.js";
import { NvdaReader } from "./screenreaders/nvdaReader.js";
import { VoiceOverReader } from "./screenreaders/voiceOverReader.js";
import { runScreenReaderScript } from "./runScreenReaderScript.js";
import { getScreenReaderConfig } from "./screenReaderKinds.js";
import type { ScreenReaderScriptOptions } from "./models.js";

export async function runScreenReader(
  options: ScreenReaderScriptOptions,
): Promise<void> {
  const cli = parseCliArgs(options.argv ?? process.argv);
  const config = getScreenReaderConfig(options.kind);

  const url = cli.url ?? options.url;
  console.log("Mode:", cli.mode);
  console.log(
    "Element selector:",
    cli.elementSelector ?? "(all actionable elements)",
  );
  console.log("Snapshot output:", cli.snapshotPath ?? "(none)");
  console.log("Compare:", cli.comparePaths ?? "(none)");

  const reader =
    options.kind === "voiceover" ? new VoiceOverReader() : new NvdaReader();

  await runScreenReaderScript({
    url,
    screenReaderName: config.label,
    reader,
    mode: cli.mode,
    pause: cli.pause,
    waitForSelector: cli.waitForSelector,
    elementSelector: cli.elementSelector,
    snapshotPath: cli.snapshotPath,
    comparePaths: cli.comparePaths,
  });
}

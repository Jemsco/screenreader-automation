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
    url: options.url,
    screenReaderName: config.label,
    reader,
    mode: cli.mode,
    elementSelector: cli.elementSelector,
    snapshotPath: cli.snapshotPath,
    comparePaths: cli.comparePaths,
  });
}

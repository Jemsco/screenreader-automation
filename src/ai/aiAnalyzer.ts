import fs from "node:fs/promises";
import path from "node:path";
import { buildAccessibilityPrompt } from "./promptBuilder.js";
import { analyzeWithGemini, analyzeWithClaude } from "./aiProvider.js";
import { typeText } from "./terminalTyper.js";
import { demoPrompt } from "./demoPrompt.js";
import type { Provider } from "./types.js";
import type { SnapshotFile } from "../core/models.js";

// ---------------------------------------------------------------------------
// Claude path — streams markdown directly to stdout and saves to file
// ---------------------------------------------------------------------------

async function runClaude(
  jsonFilePath: string,
  jsonData: SnapshotFile,
  provider: Provider,
): Promise<void> {
  const prompt = buildAccessibilityPrompt(jsonData);
  await typeText(demoPrompt);

  console.log("\n=======================================================");
  console.log("           AI ACCESSIBILITY AUDIT — CLAUDE             ");
  console.log("=======================================================\n");

  // Collect chunks for file save while streaming to stdout
  const chunks: string[] = [];

  await analyzeWithClaude(prompt, (chunk) => {
    process.stdout.write(chunk);
    chunks.push(chunk);
  });

  // Ensure terminal ends on a new line after streaming
  process.stdout.write("\n\n");
  console.log("=======================================================\n");

  // Save the streamed output as a markdown report
  const fullReport = chunks.join("");
  const parsedPath = path.parse(jsonFilePath);
  const outputPath = path.join(
    parsedPath.dir,
    `${parsedPath.name}-claude-audit-report.md`,
  );
  await fs.writeFile(outputPath, fullReport, "utf-8");
  console.log(`✅ Report saved to: ${outputPath}`);
}

// ---------------------------------------------------------------------------
// Gemini path — waits for the full response, then writes the markdown verbatim
// (same output contract as the Claude path; the shared prompt asks for markdown).
// ---------------------------------------------------------------------------

async function runGemini(
  jsonFilePath: string,
  jsonData: SnapshotFile,
): Promise<void> {
  const prompt = buildAccessibilityPrompt(jsonData);
  // await typeText(demoPrompt);

  console.log("Calling Gemini...");
  const markdownReport = await analyzeWithGemini(prompt);

  console.log("\n=======================================================");
  console.log("           AI ACCESSIBILITY AUDIT — GEMINI             ");
  console.log("=======================================================\n");
  console.log(markdownReport);
  console.log("=======================================================\n");

  const parsedPath = path.parse(jsonFilePath);
  const outputPath = path.join(
    parsedPath.dir,
    `${parsedPath.name}-gemini-audit-report.md`,
  );
  await fs.writeFile(outputPath, markdownReport, "utf-8");
  console.log(`✅ Report saved to: ${outputPath}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function analyzeAccessibility(
  jsonFilePath: string,
  provider: Provider,
): Promise<void> {
  const jsonFileContent = await fs.readFile(jsonFilePath, "utf-8");
  // JSON.parse returns `any`; assert the snapshot shape once here so the rest
  // of the module is type-checked. This is an assertion, not validation — a
  // malformed file would fail at runtime, not compile time.
  const jsonData = JSON.parse(jsonFileContent) as SnapshotFile;

  if (provider === "claude") {
    await runClaude(jsonFilePath, jsonData, provider).catch((err) => {
      console.error("Claude analysis failed:", err);
      process.exit(1);
    });
  } else {
    await runGemini(jsonFilePath, jsonData).catch((err) => {
      console.error("Gemini analysis failed:", err);
      process.exit(1);
    });
  }
}

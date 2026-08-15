import { analyzeAccessibility } from "./aiAnalyzer.js";

const jsonFilePath = process.argv[2];
if (!jsonFilePath) {
  console.error("Usage: npm run ai:claude -- <path-to-json>\n");
  process.exit(1);
}

await analyzeAccessibility(jsonFilePath, "claude");

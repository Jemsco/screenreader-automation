import fs from "node:fs/promises";
import path from "node:path";
import { buildAccessibilityPrompt } from "./promptBuilder.js";
import { analyzeWithGemini } from "./aiProvider.js";
import { typeText } from "./terminalTyper.js";
import { demoPrompt } from "./demoPrompt.js";

interface AuditFinding {
  id: string;
  severity: string;
  category: string;
  elementSelector: string;
  observed: string;
  whyItIsAProblem: string;
  whoIsAffected: string;
  recommendation: string;
}

interface GlobalInconsistency {
  issue: string;
  details: string;
  impact: string;
  developerAction: string;
}

function generateMarkdownReport(data: any, originalScan: any): string {
  const meta = originalScan.auditMetadata || originalScan.scanOverview || {};

  let dateStr = "Unknown Date";
  if (meta.timestamp) {
    try {
      dateStr = new Date(meta.timestamp).toLocaleString();
    } catch {
      dateStr = meta.timestamp;
    }
  }

  let md = `# 🔍 Accessibility Audit Report\n\n`;
  md += `**URL Tested:** \`${meta.url || "N/A"}\`  \n`;
  md += `**Timestamp:** ${dateStr}  \n`;
  md += `**Environment:** ${meta.screenReader || "N/A"} on ${meta.environment || meta.overallStatus || "N/A"}  \n\n`;
  md += `--- \n\n`;

  const globalIssues = data.globalInconsistencies || data.globalIssues || [];
  if (globalIssues.length > 0) {
    md += `## 🚨 Global / Systemic Inconsistencies\n\n`;
    for (const global of globalIssues) {
      md += `### ⚠️ ${global.issue || "Systemic Issue"}\n`;
      md += `* **Details:** ${global.details || global.description || "N/A"}\n`;
      md += `* **Impact:** ${global.impact || "N/A"}\n`;
      md += `* **Required Developer Action:** ${global.developerAction || global.recommendation || "N/A"}\n\n`;
    }
    md += `--- \n\n`;
  }

  md += `## 📋 Specific Accessibility Findings\n\n`;

  const severityEmojis: Record<string, string> = {
    Critical: "🔴",
    High: "🟠",
    Medium: "🟡",
    Low: "🟢",
  };

  const findingsList = data.findings || data.issues || [];
  for (const finding of findingsList) {
    const severity = finding.severity || "Unknown";
    const emoji = severityEmojis[severity] || "🔹";
    md += `### ${emoji} ${finding.id || "UNASSIGNED"}: ${finding.category || "General finding"}\n`;
    md += `* **Severity:** **${severity}**\n`;
    md += `* **Target Element:** \`${finding.elementSelector || "N/A"}\`\n`;
    md += `* **Observed Behavior:** ${finding.observed || finding.observation || "N/A"}\n`;
    md += `* **Why It Is A Problem:** ${finding.whyItIsAProblem || finding.description || "N/A"}\n`;
    md += `* **Who Is Affected:** ${finding.whoIsAffected || "N/A"}\n`;
    md += `* **Recommendation:** ${finding.recommendation || "N/A"}\n\n`;
  }

  return md;
}

/**
 * Sanitizes markdown code fences and repairs internal string formatting errors.
 */
function cleanJsonString(rawText: string): string {
  let clean = rawText.trim();

  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  clean = clean.trim();

  // Escapes raw, literal control character newlines found inside text properties
  clean = clean.replace(/[\r\n\t]+/g, " ");

  return clean;
}

export async function analyzeAccessibility(
  jsonFilePath: string,
): Promise<void> {
  console.log(`Reading snapshot file: ${jsonFilePath}...`);
  const jsonFileContent = await fs.readFile(jsonFilePath, "utf-8");
  const jsonData = JSON.parse(jsonFileContent);

  console.log("Generating prompt and sending request to Gemini...");
  //   const response = await analyzeWithGemini(buildAccessibilityPrompt(jsonData));
  const prompt = buildAccessibilityPrompt(jsonData);

  await typeText(demoPrompt);

  const response = await analyzeWithGemini(prompt);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `AI request failed: ${response.status} ${response.statusText}\n${errorText}`,
    );
  }

  const rawPayload = await response.json();
  const stringifiedJson = rawPayload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!stringifiedJson) {
    throw new Error(
      "Failed to extract content text wrapper from Gemini API payload response.",
    );
  }

  const sanitizedJson = cleanJsonString(stringifiedJson);

  try {
    const auditData = JSON.parse(sanitizedJson);
    const markdownReport = generateMarkdownReport(auditData, jsonData);

    console.log("\n=======================================================");
    console.log("                AI AUDIT SUMMARY                       ");
    console.log("=======================================================\n");
    console.log(markdownReport);
    console.log("=======================================================\n");

    const parsedPath = path.parse(jsonFilePath);
    const outputFileName = `${parsedPath.name}-audit-report.md`;
    const outputPath = path.join(parsedPath.dir, outputFileName);

    await fs.writeFile(outputPath, markdownReport, "utf-8");
    console.log(
      `✅ Clean markdown report successfully saved to: ${outputPath}`,
    );
  } catch (parseError: any) {
    console.error("\n❌ Failed to parse sanitized JSON payload from Gemini.");

    // Help debug by printing out the exact segment where the JSON engine choked
    if (parseError.message && parseError.message.includes("position")) {
      const posMatch = parseError.message.match(/position\s+(\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        console.error(`\nError Context around position ${pos}:`);
        console.error(
          sanitizedJson.slice(
            Math.max(0, pos - 40),
            Math.min(sanitizedJson.length, pos + 40),
          ),
        );
        console.error("^".padStart(Math.min(pos, 41)));
      }
    }
    throw parseError;
  }
}

const jsonFilePath = process.argv[2];
if (!jsonFilePath) {
  console.error("Usage: npm run ai -- <path-to-json-file>");
  process.exit(1);
}

analyzeAccessibility(jsonFilePath).catch((error) => {
  console.error("AI analysis failed:", error);
  process.exit(1);
});

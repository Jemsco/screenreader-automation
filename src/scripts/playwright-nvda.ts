import { nvda } from "@guidepup/guidepup";
import { chromium, type Page } from "playwright";
import { getActionableElements } from "../core/getActionableElements.js";
import { NvdaReader, scanPage } from "../core/scanner.js";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack ?? err.message;
  }
  try {
    return JSON.stringify(err, Object.getOwnPropertyNames(err));
  } catch {
    return String(err);
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", formatError(reason));
});

process.on("uncaughtException", (error) => {
  console.error("uncaughtException:", formatError(error));
  try {
    execSync("taskkill /f /im nvda.exe /t", { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  process.exit(1);
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "all" | "actionable";

interface ElementResult {
  selector: string;
  itemText: string;
  announced: string;
  domInfo: DomInfo | null;
}

interface SnapshotFile {
  url: string;
  timestamp: string;
  mode: Mode;
  element: string | null;
  results: ElementResult[];
}

interface DomInfo {
  tag: string;
  role: string | null;
  type: string | null;
  tabindex: string | null;
}

// ─── Argument Parsing ─────────────────────────────────────────────────────────

const args = process.argv;
const mode: Mode = args.includes("--mode=all") ? "all" : "actionable";

// --element="[element][data-testid='[the id]']"
const elementArg = args.find((a) => a.startsWith("--element="));
const elementSelector = elementArg
  ? elementArg.split("=").slice(1).join("=")
  : null;

// --snapshot=./snapshots/[snapshot name].json
const snapshotArg = args.find((a) => a.startsWith("--snapshot="));
const snapshotPath = snapshotArg
  ? snapshotArg.split("=").slice(1).join("=")
  : null;

// --compare ./snapshots/baseline.json ./snapshots/current.json
const compareIdx = args.indexOf("--compare");
let comparePaths: [string, string] | null = null;
if (compareIdx !== -1) {
  const compareArg = args[compareIdx];
  if (compareArg?.includes("=")) {
    const compareValue = compareArg.split("=").slice(1).join("=");
    if (compareValue.includes(",")) {
      // comma-separated: --compare=baseline.json,current.json
      const parts = compareValue.split(",");
      if (parts[0] && parts[1]) {
        comparePaths = [parts[0], parts[1]];
      }
    } else {
      // space-separated: --compare=baseline.json current.json
      const nextArg = args[compareIdx + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        comparePaths = [compareValue, nextArg];
      }
    }
  } else if (compareArg) {
    // space-separated: --compare baseline.json current.json
    const fileA = args[compareIdx + 1];
    const fileB = args[compareIdx + 2];
    if (fileA && fileB && !fileA.startsWith("--") && !fileB.startsWith("--")) {
      comparePaths = [fileA, fileB];
    }
  }
}

console.log("Mode:", mode);
console.log(
  "Element selector:",
  elementSelector ?? "(all actionable elements)",
);
console.log("Snapshot output:", snapshotPath ?? "(none)");
console.log("Compare:", comparePaths ?? "(none)");

// ─── Compare Mode (no browser needed) ────────────────────────────────────────

if (comparePaths) {
  const [fileA, fileB] = comparePaths;
  const snapshotA: SnapshotFile = JSON.parse(fs.readFileSync(fileA, "utf-8"));
  const snapshotB: SnapshotFile = JSON.parse(fs.readFileSync(fileB, "utf-8"));

  console.log("\n══════════════════════════════════════════");
  console.log(" SNAPSHOT DIFF");
  console.log(`  Baseline : ${fileA}  (${snapshotA.timestamp})`);
  console.log(`  Current  : ${fileB}  (${snapshotB.timestamp})`);
  console.log("══════════════════════════════════════════\n");

  const mapA = new Map(snapshotA.results.map((r) => [r.selector, r]));
  const mapB = new Map(snapshotB.results.map((r) => [r.selector, r]));

  let differences = 0;

  // Elements present in both — check for changes
  for (const [selector, b] of mapB) {
    const a = mapA.get(selector);
    if (!a) {
      console.log(`[ADDED]   ${selector}`);
      console.log(`          announced: "${b.announced}"`);
      console.log(`          itemText : "${b.itemText}"\n`);
      differences++;
      continue;
    }
    const announcedChanged = a.announced !== b.announced;
    const itemTextChanged = a.itemText !== b.itemText;
    if (announcedChanged || itemTextChanged) {
      console.log(`[CHANGED] ${selector}`);
      if (announcedChanged) {
        console.log(
          `          announced: "${a.announced}"  →  "${b.announced}"`,
        );
      }
      if (itemTextChanged) {
        console.log(`          itemText : "${a.itemText}"  →  "${b.itemText}"`);
      }
      console.log();
      differences++;
    }
  }

  // Elements only in baseline (removed)
  for (const [selector] of mapA) {
    if (!mapB.has(selector)) {
      console.log(`[REMOVED] ${selector}\n`);
      differences++;
    }
  }

  if (differences === 0) {
    console.log("✅  No differences found.");
  } else {
    console.log(`⚠️   ${differences} difference(s) found.`);
    process.exit(1); // non-zero exit so CI can detect regressions
  }
  process.exit(0);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActionable(domInfo: DomInfo | null): boolean {
  if (!domInfo) return false;
  if (domInfo.tabindex === "-1") return false;

  const actionableTags = new Set([
    "a",
    "button",
    "input",
    "select",
    "textarea",
  ]);
  if (actionableTags.has(domInfo.tag)) return true;

  const actionableRoles = new Set([
    "button",
    "link",
    "checkbox",
    "radio",
    "switch",
    "textBox",
    "tab",
    "menuitem",
  ]);
  if (domInfo.role && actionableRoles.has(domInfo.role)) return true;

  return false;
}

async function getDomInfo(page: Page): Promise<DomInfo | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      type: el.getAttribute("type"),
      tabindex: el.getAttribute("tabindex"),
    };
  });
}

/** Returns a stable string key for a given element (tag + role + index fallback). */
async function getSelectorKey(
  el: Awaited<ReturnType<typeof getActionableElements>>[number],
  idx: number,
): Promise<string> {
  return el.evaluate((node, i) => {
    const tag = (node as HTMLElement).tagName.toLowerCase();
    const role = (node as HTMLElement).getAttribute("role") ?? "";
    const id = (node as HTMLElement).id ? `#${(node as HTMLElement).id}` : "";
    const label = (node as HTMLElement).getAttribute("aria-label") ?? "";
    const roleStr = role ? `[role="${role}"]` : "";
    const labelStr = label ? `[aria-label="${label}"]` : "";
    return `${tag}${roleStr}${id}${labelStr}[${i}]`;
  }, idx);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const url = "http://127.0.0.1:5500/src/pages/test-page.html";

async function main() {
  console.log("Launching Playwright");
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 650, height: 698 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  console.log("Page loaded");

  console.log("Starting NVDA");
  const reader = new NvdaReader();
  const results: ElementResult[] = [];

  // ── Branch: single --element selector ──────────────────────────────────────
  if (elementSelector) {
    console.log(`Targeting element: ${elementSelector}`);
    const el = page.locator(elementSelector).first();

    await el.focus();
    await reader.moveToFocus();

    const announced = await reader.getAnnouncement();
    const itemText = await nvda.itemText();
    const domInfo = await getDomInfo(page);

    const result: ElementResult = {
      selector: elementSelector,
      itemText: itemText ?? "",
      announced,
      domInfo,
    };

    console.log(result);
    results.push(result);

    // ── Branch: iterate all actionable elements (original behaviour) ───────────
  } else {
    const elements = await getActionableElements(page);
    console.log(`Found ${elements.length} actionable elements on the page.`);

    await page.bringToFront();
    await page.keyboard.press("Tab");

    const scanResults = await scanPage(page, reader, {
      async onResult({ index, element, announcement }) {
        const itemText = await nvda.itemText();
        const domInfo = await getDomInfo(page);
        const selectorKey = await getSelectorKey(element, index);

        const result: ElementResult = {
          selector: selectorKey,
          itemText: itemText ?? "",
          announced: announcement,
          domInfo,
        };

        if (
          mode === "all" ||
          (mode === "actionable" && isActionable(domInfo))
        ) {
          console.log(result);
          results.push(result);
        }
      },
    });

    if (scanResults.length === 0) {
      console.log("No actionable elements were scanned.");
    }
  }

  await browser.close();
  console.log("Playwright closed");

  // ── Write snapshot if requested ────────────────────────────────────────────
  if (snapshotPath) {
    const snapshot: SnapshotFile = {
      url,
      timestamp: new Date().toISOString(),
      mode,
      element: elementSelector,
      results,
    };
    const dir = path.dirname(snapshotPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), "utf-8");
    console.log(`\nSnapshot saved → ${snapshotPath}`);
  }
}

await main().catch((error) => {
  console.error("Fatal error:", formatError(error));
  try {
    execSync("taskkill /f /im nvda.exe /t", { stdio: "ignore" });
  } catch {
    // ignore
  }
  process.exit(1);
});

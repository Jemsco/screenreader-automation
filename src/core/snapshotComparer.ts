import { readSnapshotFile } from "./snapshotWriter.js";
import type { SnapshotComparisonResult } from "./models.js";

export function compareSnapshotFiles(
  fileA: string,
  fileB: string,
): SnapshotComparisonResult {
  const snapshotA = readSnapshotFile(fileA);
  const snapshotB = readSnapshotFile(fileB);

  const mapA = new Map(snapshotA.results.map((r) => [r.selector, r]));
  const mapB = new Map(snapshotB.results.map((r) => [r.selector, r]));

  const lines: string[] = [];
  let differences = 0;

  for (const [selector, b] of mapB) {
    const a = mapA.get(selector);
    if (!a) {
      lines.push(`[ADDED]   ${selector}`);
      lines.push(`          announced: "${b.announced}"`);
      lines.push(`          itemText : "${b.itemText}"`);
      differences++;
      continue;
    }

    const announcedChanged = a.announced !== b.announced;
    const itemTextChanged = a.itemText !== b.itemText;
    if (announcedChanged || itemTextChanged) {
      lines.push(`[CHANGED] ${selector}`);
      if (announcedChanged) {
        lines.push(
          `          announced: "${a.announced}"  →  "${b.announced}"`,
        );
      }
      if (itemTextChanged) {
        lines.push(`          itemText : "${a.itemText}"  →  "${b.itemText}"`);
      }
      differences++;
    }
  }

  for (const [selector] of mapA) {
    if (!mapB.has(selector)) {
      lines.push(`[REMOVED] ${selector}`);
      differences++;
    }
  }

  return { snapshotA, snapshotB, differences, lines };
}

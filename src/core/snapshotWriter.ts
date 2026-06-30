import * as fs from "node:fs";
import * as path from "node:path";
import type {
  SnapshotElement,
  SnapshotFile,
  SnapshotMode,
  ScreenReaderName,
} from "./models.js";

export function createSnapshotFile(params: {
  url: string;
  mode: SnapshotMode;
  element: string | null;
  screenReader: ScreenReaderName;
  results: SnapshotElement[];
}): SnapshotFile {
  return {
    schemaVersion: 1,
    url: params.url,
    timestamp: new Date().toISOString(),
    mode: params.mode,
    element: params.element,
    screenReader: params.screenReader,
    results: params.results,
  };
}

export function writeSnapshotFile(
  snapshotPath: string,
  snapshot: SnapshotFile,
): void {
  const dir = path.dirname(snapshotPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), "utf-8");
}

export function readSnapshotFile(filePath: string): SnapshotFile {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as SnapshotFile;
}

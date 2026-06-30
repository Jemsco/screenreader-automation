import type { ElementHandle } from "playwright";
import type { ScreenReaderKind } from "./screenReaderKinds.js";
import type { ScreenReader } from "./screenreaders/screenReader.js";
import type { Mode } from "./cli.js";
import type { Page } from "playwright";

export type SnapshotMode = "all" | "actionable";
export type ScreenReaderName = "VoiceOver" | "NVDA";

export interface DomInfo {
  index: number;
  tag: string;
  role: string | null;
  type: string | null;
  tabindex: string | null;
  id?: string;
  name?: string;
  disabled?: boolean;
  checked?: boolean;
  expanded?: boolean;
  selected?: boolean;
  value?: string;
  readonly?: boolean;
  required?: boolean;
  accessibleName?: string;
  ariaLabel?: string | null;
  ariaLabelledBy?: string | null;
  ariaDescribedBy?: string | null;
  ariaActiveDescendant?: string | null;
  ariaControls?: string | null;
  ariaCurrent?: string | null;
}

export interface SnapshotElement {
  selector: string;
  index: number;
  itemText: string;
  announced: string;
  screenReader: ScreenReaderName;
  domInfo: DomInfo | null;
}

export interface SnapshotFile {
  schemaVersion: number;
  url: string;
  timestamp: string;
  mode: SnapshotMode;
  element: string | null;
  screenReader: ScreenReaderName;
  results: SnapshotElement[];
}

export interface SnapshotComparisonResult {
  snapshotA: SnapshotFile;
  snapshotB: SnapshotFile;
  differences: number;
  lines: string[];
}

export interface ScanResult {
  index: number;
  element: ElementHandle;
  tag: string;
  role: string | null;
  type: string | null;
  text: string;
  announcement: string;
  itemText: string;
}

export interface ElementInfo {
  tag: string;
  role: string | null;
  type: string | null;
  text: string;
}

export interface ScreenReaderScriptOptions {
  kind: ScreenReaderKind;
  url: string;
  argv?: string[];
}

export interface RunScreenReaderScriptOptions {
  url: string;
  screenReaderName: ScreenReaderName;
  reader: ScreenReader;
  mode: Mode;
  elementSelector: string | null;
  snapshotPath: string | null;
  comparePaths: [string, string] | null;
  isActionable?(domInfo: DomInfo | null): boolean;
  getDomInfo?(page: Page): Promise<DomInfo | null>;
  getSelectorKey?(element: ElementHandle, index: number): Promise<string>;
}

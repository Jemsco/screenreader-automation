import type { ElementHandle, Page } from "playwright";
export interface ScreenReader {
  start(): Promise<void>;
  clearLog(): Promise<void>;
  clearItemTextLog(): Promise<void>;
  focusElement(
    page: Page,
    element: ElementHandle,
    index: number,
    elements: ElementHandle[],
  ): Promise<boolean>;
  syncCursor(): Promise<string>;
  press(key: string): Promise<void>;
  waitForAnnouncement(): Promise<string>;
  normalizeAnnouncement(text: string): Promise<string>;
  itemText(): Promise<string>;
  describeItemWithKeyboardFocus(): Promise<void>;
  stop(): Promise<void>;
}

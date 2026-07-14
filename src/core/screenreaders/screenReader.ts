export interface ScreenReader {
  start(): Promise<void>;
  clearLog(): Promise<void>;
  clearItemTextLog(): Promise<void>;
  syncVoiceOverCursor(): Promise<string>;
  waitForAnnouncement(): Promise<string>;
  normalizeVoiceOverAnnouncement(text: string): Promise<string>;
  itemText(): Promise<string>;
  describeItemWithKeyboardFocus(): Promise<void>;
  stop(): Promise<void>;
}

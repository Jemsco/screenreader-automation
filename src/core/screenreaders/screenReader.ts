export interface ScreenReader {
  start(): Promise<void>;
  clearLog(): Promise<void>;
  moveToFocus(): Promise<string>;
  waitForAnnouncement(): Promise<string>;
  itemText(): Promise<string>;
  stop(): Promise<void>;
}

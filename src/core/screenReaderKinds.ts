export type ScreenReaderKind = "nvda" | "voiceover";

import type { ScreenReaderName } from "./models.js";

export interface ScreenReaderConfig {
  kind: ScreenReaderKind;
  label: ScreenReaderName;
}

export const screenReaderConfigs: Record<ScreenReaderKind, ScreenReaderConfig> =
  {
    nvda: {
      kind: "nvda",
      label: "NVDA",
    },
    voiceover: {
      kind: "voiceover",
      label: "VoiceOver",
    },
  };

export function getScreenReaderConfig(
  kind: ScreenReaderKind,
): ScreenReaderConfig {
  return screenReaderConfigs[kind];
}

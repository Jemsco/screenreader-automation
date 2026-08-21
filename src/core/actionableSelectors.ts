export const ACTIONABLE_SELECTORS = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='menuitem']",
  "[role='option']",
  "[role='radio']",
  "[role='switch']",
  "[role='textbox']",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
] as const;

// Utility type to get the index of an actionable selector avaible if needed
// export type ActionableSelector = (typeof ACTIONABLE_SELECTORS)[number];
export const ACTIONABLE_ELEMENTS = ACTIONABLE_SELECTORS.join(", ");

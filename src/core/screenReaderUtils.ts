import type { Page } from "playwright";
import type { DomInfo } from "./models.js";

export function isActionableDomInfo(domInfo: DomInfo | null): boolean {
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

export async function getDomInfo(page: Page): Promise<DomInfo | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    return {
      index: 0,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      type: el.getAttribute("type"),
      tabindex: el.getAttribute("tabindex"),
    };
  });
}

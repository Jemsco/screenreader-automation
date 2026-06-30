import type { ElementHandle } from "playwright";

export interface ElementInfo {
  tag: string;
  role: string | null;
  type: string | null;
  text: string;
}

export async function getElementInfo(
  element: ElementHandle,
): Promise<ElementInfo> {
  return element.evaluate((el) => {
    const element = el as HTMLElement;
    return {
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      type: element.getAttribute("type"),
      text: element.innerText || element.textContent || "",
    };
  });
}

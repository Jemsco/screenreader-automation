import type { ElementHandle } from "playwright";
import type { ElementInfo } from "./models.js";

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

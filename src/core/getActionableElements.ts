import type { Page, ElementHandle } from "playwright";
import { ACTIONABLE_ELEMENTS } from "./actionableSelectors.js";

export async function getActionableElements(
  page: Page,
): Promise<ElementHandle[]> {
  return page.$$(ACTIONABLE_ELEMENTS);
}

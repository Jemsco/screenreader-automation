import type { Page, ElementHandle } from "playwright";

export async function getActionableElements(page: Page): Promise<ElementHandle[]> {
	const elements = await page.$$("a[href], button, input, select, textarea, details, [role='button'], [role='link'], [role='checkbox'],[role='menuitem'], [role='option'], [role='radio'], [role='switch'], [role='textbox'], [tabindex]:not([tabindex='-1']), [contenteditable='true']")
	return elements;
}
import { expect, type Locator, type Page } from '@playwright/test';

export interface NoteInput {
  title: string;
  description?: string;
  tags?: string;
  priority?: 'No priority' | 'Low' | 'Medium' | 'High';
  due?: string;
}

export async function addNote(page: Page, { title, description = '', tags = '', priority, due }: NoteInput) {
  const form = page.getByRole('region', { name: 'New note' });
  await form.getByLabel('Title').fill(title);
  await form.getByLabel('Description').fill(description);
  await form.getByRole('textbox', { name: 'Tags' }).fill(tags);
  if (priority) await form.getByLabel('Priority').selectOption({ label: priority });
  if (due) await form.getByLabel('Due date').fill(due);
  await form.getByRole('button', { name: 'Add note' }).click();
}

export function noteList(page: Page): Locator {
  return page.getByRole('region', { name: 'Notes', exact: true });
}

export function column(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true });
}

/** A note card inside a region, found by its title. */
export function card(region: Locator, title: string): Locator {
  return region.getByRole('article', { name: title, exact: true });
}

export function toasts(page: Page): Locator {
  return page.getByRole('region', { name: 'Notifications' });
}

/** Drags a card to the end of a column (the empty space under its last card). */
export async function dragToColumn(page: Page, source: Locator, columnName: string) {
  const body = column(page, columnName).locator('.column-body');
  await body.scrollIntoViewIfNeeded();
  const box = (await body.boundingBox())!;
  await source.dragTo(body, { targetPosition: { x: box.width / 2, y: box.height - 6 } });
}

/** Clicks a button in a card's hover toolbar. */
export async function cardButton(target: Locator, name: string) {
  await target.hover();
  await target.getByRole('button', { name, exact: true }).click();
}

export async function cardMenu(page: Page, target: Locator, item: string) {
  await cardButton(target, 'More actions');
  await page.getByRole('menuitem', { name: item, exact: true }).click();
}

export async function columnTitles(page: Page, columnName: string): Promise<string[]> {
  return column(page, columnName).getByRole('article').locator('h3').allInnerTexts();
}

export async function importFile(page: Page, name: string, content: string) {
  await page.getByTestId('import-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(toasts(page)).toContainText(text);
}

export function localISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A drag made of several small mouse moves, like a real user's drag. */
export async function dragWithMouse(page: Page, source: Locator, target: Locator, position: { x: number; y: number }) {
  const from = (await source.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  const to = (await target.boundingBox())!;
  await page.mouse.move(to.x + position.x, to.y + position.y, { steps: 10 });
  await page.mouse.up();
}

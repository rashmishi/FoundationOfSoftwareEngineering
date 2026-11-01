import type { Locator, Page } from '@playwright/test';

export interface NoteInput {
  title: string;
  description?: string;
  tags?: string;
}

export async function addNote(page: Page, { title, description = '', tags = '' }: NoteInput) {
  const form = page.getByRole('region', { name: 'Add a note' });
  await form.getByLabel('Title').fill(title);
  await form.getByLabel('Description').fill(description);
  await form.getByLabel('Tags').fill(tags);
  await form.getByRole('button', { name: 'Add note' }).click();
}

export function noteList(page: Page): Locator {
  return page.getByRole('region', { name: 'Notes', exact: true });
}

export function column(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true });
}

/** A note card within a region, found by its heading. */
export function card(region: Locator, title: string): Locator {
  return region.locator('article').filter({ has: region.page().getByRole('heading', { name: title, exact: true }) });
}

export type Theme = 'light' | 'dark' | 'contrast';

/** Chooses a theme for every page load in this test, as the Display settings dialog would. */
export async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((value) => {
    localStorage.setItem('notes-board:preferences', JSON.stringify({ theme: value }));
  }, theme);
}

export async function importFile(page: Page, name: string, content: string) {
  await page.getByTestId('import-file').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(content),
  });
}

/** Grabs a card by its heading, as the rest of the card is mostly controls. */
export const GRAB_POINT = { sourcePosition: { x: 24, y: 16 } };

export async function dragToColumn(page: Page, source: Locator, columnName: string) {
  await source.dragTo(column(page, columnName), GRAB_POINT);
}

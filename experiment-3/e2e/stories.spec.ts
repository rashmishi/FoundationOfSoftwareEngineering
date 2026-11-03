import { expect, test } from '@playwright/test';
import { addNote, column, drag, notes } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('drag a note from the list onto a column, with visual feedback, and it persists', async ({ page }) => {
  await addNote(page, 'Drag me');
  const card = notes(page).getByRole('article', { name: 'Drag me' });
  const target = column(page, 'In progress');
  const d = await drag(page, card, target);
  // Feedback while dragging: lifted copy labelled "Moving" and the drop target outlined with "Drop here".
  await expect(page.locator('.dnd-overlay').getByText('Moving')).toBeVisible();
  await expect(target.getByText('Drop here')).toBeVisible();
  await expect(target).toHaveCSS('outline-style', 'dashed');
  await d.drop();
  await expect(target.getByRole('article', { name: 'Drag me' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('“Drag me” moved to In progress, position 1 of 1.');
  await page.reload();
  await expect(column(page, 'In progress').getByRole('article', { name: 'Drag me' })).toBeVisible();
});

test('drag between columns removes from the first, and dropping outside keeps the column', async ({ page }) => {
  await addNote(page, 'Hop');
  let d = await drag(page, notes(page).getByRole('article', { name: 'Hop' }), column(page, 'To do'));
  await d.drop();
  await expect(column(page, 'To do').getByRole('article', { name: 'Hop' })).toBeVisible();

  d = await drag(page, column(page, 'To do').getByRole('article', { name: 'Hop' }), column(page, 'Done'));
  await d.drop();
  await expect(column(page, 'Done').getByRole('article', { name: 'Hop' })).toBeVisible();
  await expect(column(page, 'To do').getByRole('article')).toHaveCount(0);

  // Drop on the page header: outside every column.
  d = await drag(page, column(page, 'Done').getByRole('article', { name: 'Hop' }), page.getByRole('heading', { level: 1 }));
  await d.drop();
  await expect(column(page, 'Done').getByRole('article', { name: 'Hop' })).toBeVisible();
});

test('reorder within a column by dragging', async ({ page }) => {
  for (const t of ['One', 'Two']) {
    await addNote(page, t);
    const d = await drag(page, notes(page).getByRole('article', { name: t }), column(page, 'To do'));
    await d.drop();
    await expect(column(page, 'To do').getByRole('article', { name: t })).toBeVisible();
  }
  const titles = () => column(page, 'To do').locator('.title-button').allTextContents();
  expect(await titles()).toEqual(['One', 'Two']);
  const d = await drag(page, column(page, 'To do').getByRole('article', { name: 'Two' }), column(page, 'To do').getByRole('article', { name: 'One' }));
  await d.drop();
  await expect.poll(titles).toEqual(['Two', 'One']);
});

test('export downloads valid JSON; import restores it; invalid file shows an error', async ({ page }) => {
  await addNote(page, 'Export me', 'work, urgent');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export notes' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^notes-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await file.path();
  const fs = await import('node:fs');
  const text = fs.readFileSync(path, 'utf8');
  const data = JSON.parse(text);
  expect(data.notes[0]).toMatchObject({ title: 'Export me', tags: ['work', 'urgent'] });

  // Clear storage, reload, then import the file.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('input[type="file"]').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('dialog', { name: 'Import notes' }).getByRole('button', { name: 'Replace notes' }).click();
  await expect(notes(page).getByRole('article', { name: 'Export me' })).toBeVisible();
  await page.reload();
  await expect(notes(page).getByRole('article', { name: 'Export me' })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('nope') });
  await expect(page.getByText('The file is not valid JSON. Choose a file exported from this application.').first()).toBeVisible();
  await expect(notes(page).getByRole('article', { name: 'Export me' })).toBeVisible();
});

test('the whole flow works with the keyboard only', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to board' })).toBeFocused();
  await page.getByRole('region', { name: 'New note' }).getByLabel(/^Title/).focus();
  await page.keyboard.type('Keys');
  await page.keyboard.press('Enter');
  const handle = notes(page).getByRole('button', { name: 'Drag, note “Keys”' });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(handle).toBeFocused();
  await page.keyboard.press('Space');
  await expect(column(page, 'In progress').getByRole('article', { name: 'Keys' })).toBeVisible();
  await expect(handle).toBeFocused();
});

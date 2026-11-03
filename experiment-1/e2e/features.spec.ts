import { expect, test } from '@playwright/test';
import {
  addNote,
  card,
  cardButton,
  cardMenu,
  column,
  columnTitles,
  dragToColumn,
  dragWithMouse,
  expectToast,
  localISO,
  noteList,
  toasts,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('AF-1 priorities and tags are colour-coded', async ({ page }) => {
  await addNote(page, { title: 'Urgent', tags: 'work, home', priority: 'High' });
  await addNote(page, { title: 'Later', priority: 'Low' });
  const urgent = card(noteList(page), 'Urgent');
  await expect(urgent).toHaveClass(/priority-high/);
  await expect(urgent.getByText('High priority')).toHaveClass(/priority-badge-high/);
  await expect(card(noteList(page), 'Later')).toHaveClass(/priority-low/);
  const tags = urgent.getByRole('listitem');
  await expect(tags.first()).toHaveClass(/tag-color-\d/);
  // The same tag gets the same colour everywhere.
  await addNote(page, { title: 'Other', tags: 'WORK' });
  const first = await card(noteList(page), 'Urgent').getByText('work').getAttribute('class');
  await expect(card(noteList(page), 'Other').getByText('WORK')).toHaveAttribute('class', first!);
});

test('AF-2 toasts dismiss themselves and Undo reverses a delete', async ({ page }) => {
  await addNote(page, { title: 'Oops' });
  await dragToColumn(page, card(noteList(page), 'Oops'), 'In progress');
  await cardButton(card(column(page, 'In progress'), 'Oops'), 'Delete note');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete note' }).click();
  await expect(card(noteList(page), 'Oops')).toHaveCount(0);
  await toasts(page).locator('.toast', { hasText: 'deleted' }).getByRole('button', { name: 'Undo' }).click();
  await expect(card(noteList(page), 'Oops')).toBeVisible();
  await expect(card(column(page, 'In progress'), 'Oops')).toBeVisible();
  await expect(toasts(page).locator('.toast')).toHaveCount(0, { timeout: 8000 });
});

test('AF-2 Undo reverses an edit and a move', async ({ page }) => {
  await addNote(page, { title: 'Original' });
  await cardButton(card(noteList(page), 'Original'), 'Edit note');
  await page.getByRole('dialog').getByLabel('Title').fill('Changed');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await toasts(page).locator('.toast', { hasText: 'updated' }).getByRole('button', { name: 'Undo' }).click();
  await expect(card(noteList(page), 'Original')).toBeVisible();

  await dragToColumn(page, card(noteList(page), 'Original'), 'Done');
  await toasts(page).locator('.toast', { hasText: 'Moved' }).getByRole('button', { name: 'Undo' }).click();
  await expect(card(column(page, 'Done'), 'Original')).toHaveCount(0);
  await expect(card(noteList(page), 'Original').getByTestId('column-badge')).toHaveText('Not on board');
});

test('AF-3 the edit dialog is modal and closes with Escape', async ({ page }) => {
  await addNote(page, { title: 'Modal' });
  const note = card(noteList(page), 'Modal');
  await cardButton(note, 'Edit note');
  const dialog = page.getByRole('dialog', { name: 'Edit note' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Title')).toHaveValue('Modal');
  await dialog.getByLabel('Title').fill('');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Title is required.');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(card(noteList(page), 'Modal')).toBeVisible();
});

test('AF-4 notes can be reordered within a column by dragging and from the menu', async ({ page }) => {
  for (const title of ['One', 'Two', 'Three']) {
    await addNote(page, { title });
    await dragToColumn(page, card(noteList(page), title), 'To do');
  }
  expect(await columnTitles(page, 'To do')).toEqual(['One', 'Two', 'Three']);
  const todo = column(page, 'To do');
  // Earlier drags scrolled the page; bring the column out from under the sticky filter bar.
  await page.evaluate(() => window.scrollTo(0, 0));
  await dragWithMouse(page, card(todo, 'Three'), card(todo, 'One'), { x: 40, y: 6 });
  await expect.poll(() => columnTitles(page, 'To do')).toEqual(['Three', 'One', 'Two']);
  await cardMenu(page, card(todo, 'Three'), 'Move down');
  await expect.poll(() => columnTitles(page, 'To do')).toEqual(['One', 'Three', 'Two']);
  await page.reload();
  expect(await columnTitles(page, 'To do')).toEqual(['One', 'Three', 'Two']);
});

test('AF-5 the icon toolbar appears on hover', async ({ page }) => {
  await addNote(page, { title: 'Hover me' });
  await page.mouse.move(0, 0);
  const toolbar = card(noteList(page), 'Hover me').getByRole('toolbar');
  await expect(toolbar).toHaveCSS('opacity', '0');
  await card(noteList(page), 'Hover me').hover();
  await expect(toolbar).toHaveCSS('opacity', '1');
  await expect(toolbar.getByRole('button', { name: 'Edit note' })).toHaveAttribute('title', 'Edit note');
});

test('AF-6 titles can be edited inline', async ({ page }) => {
  await addNote(page, { title: 'Inline' });
  await card(noteList(page), 'Inline').locator('h3').dblclick();
  const input = page.getByRole('textbox', { name: 'Note title' });
  await input.fill('Inline edited');
  await input.press('Enter');
  await expect(card(noteList(page), 'Inline edited')).toBeVisible();

  await card(noteList(page), 'Inline edited').locator('h3').dblclick();
  await page.getByRole('textbox', { name: 'Note title' }).fill('Discard me');
  await page.keyboard.press('Escape');
  await expect(card(noteList(page), 'Inline edited')).toBeVisible();

  await page.reload();
  await expect(card(noteList(page), 'Inline edited')).toBeVisible();
});

test('AF-7 the note menu duplicates and moves notes, and works with the keyboard', async ({ page }) => {
  await addNote(page, { title: 'Menu note' });
  await cardMenu(page, card(noteList(page), 'Menu note'), 'Done');
  await expect(card(column(page, 'Done'), 'Menu note')).toBeVisible();
  await cardMenu(page, card(noteList(page), 'Menu note'), 'Duplicate');
  await expect(card(column(page, 'Done'), 'Menu note (copy)')).toBeVisible();

  const more = card(noteList(page), 'Menu note').getByRole('button', { name: 'More actions' });
  await more.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Edit…' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
});

test('AF-7 the column menu renames, moves and deletes columns with Undo', async ({ page }) => {
  await addNote(page, { title: 'In column' });
  await dragToColumn(page, card(noteList(page), 'In column'), 'To do');
  const menuFor = (name: string) => page.getByRole('button', { name: `More actions for column ${name}` });

  await menuFor('To do').click();
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  await page.getByRole('textbox', { name: 'Column name' }).fill('Backlog');
  await page.keyboard.press('Enter');
  await expect(column(page, 'Backlog')).toBeVisible();

  await menuFor('Backlog').click();
  await page.getByRole('menuitem', { name: 'Move right' }).click();
  await expect(page.locator('section.column h2')).toHaveText(['In progress', 'Backlog', 'Done']);

  await menuFor('Backlog').click();
  await page.getByRole('menuitem', { name: 'Delete column…' }).click();
  await expect(page.getByRole('dialog')).toContainText('Its 1 note will stay in the note list.');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete column' }).click();
  await expect(column(page, 'Backlog')).toHaveCount(0);
  await expect(card(noteList(page), 'In column').getByTestId('column-badge')).toHaveText('Not on board');
  await toasts(page).locator('.toast', { hasText: 'Column “Backlog” deleted' }).getByRole('button', { name: 'Undo' }).click();
  await expect(card(column(page, 'Backlog'), 'In column')).toBeVisible();
});

test('AF-8 search and filters update the list and board live', async ({ page }) => {
  await addNote(page, { title: 'Write report', tags: 'uni', priority: 'High' });
  await addNote(page, { title: 'Buy bread', description: 'wholemeal', tags: 'home' });
  await addNote(page, { title: 'Read paper', tags: 'uni' });
  await dragToColumn(page, card(noteList(page), 'Write report'), 'To do');
  await dragToColumn(page, card(noteList(page), 'Buy bread'), 'To do');

  const search = page.getByRole('searchbox', { name: 'Search notes' });
  await search.fill('bread');
  await expect(noteList(page).getByRole('article')).toHaveCount(1);
  await expect(page.getByTestId('note-count')).toHaveText('1 of 3');
  expect(await columnTitles(page, 'To do')).toEqual(['Buy bread']);
  await expect(card(noteList(page), 'Buy bread').locator('mark')).toHaveText('bread');

  await search.fill('wholemeal');
  await expect(noteList(page).getByRole('article')).toHaveCount(1);

  await search.fill('');
  await page.getByLabel('Filter by tag').selectOption('uni');
  await expect(noteList(page).getByRole('article')).toHaveCount(2);
  await page.getByLabel('Filter by priority').selectOption({ label: 'High' });
  await expect(noteList(page).getByRole('article')).toHaveCount(1);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(noteList(page).getByRole('article')).toHaveCount(3);
});

test('AF-9 overdue notes are highlighted', async ({ page }) => {
  await addNote(page, { title: 'Late', due: localISO(-2) });
  await addNote(page, { title: 'Today', due: localISO(0) });
  await addNote(page, { title: 'Future', due: localISO(20) });
  await expect(card(noteList(page), 'Late')).toHaveClass(/is-overdue/);
  await expect(card(noteList(page), 'Late')).toContainText('Overdue');
  await expect(card(noteList(page), 'Today')).toContainText('Due today');
  await expect(card(noteList(page), 'Future')).not.toHaveClass(/is-overdue/);

  await page.getByLabel('Filter by due date').selectOption('overdue');
  await expect(noteList(page).getByRole('article')).toHaveCount(1);
  await page.getByLabel('Filter by due date').selectOption('any');

  // Finished work is not overdue.
  await dragToColumn(page, card(noteList(page), 'Late'), 'Done');
  await expect(card(noteList(page), 'Late')).not.toHaveClass(/is-overdue/);
});

test('AF-10 columns collapse, accept drops while collapsed, and stay collapsed', async ({ page }) => {
  await addNote(page, { title: 'Into collapsed' });
  await page.getByRole('button', { name: 'Collapse column Done' }).click();
  const collapsed = column(page, 'Done');
  await expect(collapsed).toHaveClass(/is-collapsed/);
  await card(noteList(page), 'Into collapsed').dragTo(collapsed);
  await expect(card(noteList(page), 'Into collapsed').getByTestId('column-badge')).toHaveText('Done');
  await expect(collapsed).toContainText('1');
  await page.reload();
  await expect(column(page, 'Done')).toHaveClass(/is-collapsed/);
  await page.getByRole('button', { name: 'Expand column Done' }).click();
  await expect(card(column(page, 'Done'), 'Into collapsed')).toBeVisible();
});

test('AF-12/13 sound and dark mode toggles are remembered', async ({ page }) => {
  const dark = page.getByRole('button', { name: 'Dark mode' });
  const sound = page.getByRole('button', { name: 'Sound effects' });
  const initial = await page.locator('html').getAttribute('data-theme');
  await dark.click();
  const flipped = initial === 'dark' ? 'light' : 'dark';
  await expect(page.locator('html')).toHaveAttribute('data-theme', flipped);
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', flipped);
  await expect(page.getByRole('button', { name: 'Sound effects' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', String(flipped === 'dark'));
});

test('damaged storage is reported and the app still starts', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('notes-kanban:v1', '{"notes": 5}'));
  await page.reload();
  await expectToast(page, /Saved notes were damaged/);
  await expect(column(page, 'To do')).toBeVisible();
});

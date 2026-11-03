import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  addNote,
  card,
  cardButton,
  column,
  columnTitles,
  dragToColumn,
  expectToast,
  importFile,
  noteList,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('US-1 Create notes', () => {
  test('AC-1.1 a note with a title is created', async ({ page }) => {
    await addNote(page, { title: 'Buy milk' });
    await expect(card(noteList(page), 'Buy milk')).toBeVisible();
  });

  test('AC-1.2 title, description and tags are all saved with the note', async ({ page }) => {
    await addNote(page, { title: 'Report', description: 'Write section 3', tags: 'uni, writing' });
    const note = card(noteList(page), 'Report');
    await expect(note).toContainText('Write section 3');
    await expect(note.getByRole('list', { name: 'Tags' }).getByRole('listitem')).toHaveText(['uni', 'writing']);
  });

  test('AC-1.3 a note without a title is not saved', async ({ page }) => {
    const form = page.getByRole('region', { name: 'New note' });
    await form.getByLabel('Description').fill('No title here');
    await form.getByRole('button', { name: 'Add note' }).click();
    await expect(form.getByRole('alert')).toHaveText('Title is required.');
    await expect(form.getByLabel('Title')).toBeFocused();
    await expect(form.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');
    await expect(noteList(page).getByRole('article')).toHaveCount(0);
    await expect(page.getByTestId('note-count')).toHaveText('0');
  });

  test('AC-1.4 a created note appears in the list and a message is displayed', async ({ page }) => {
    await addNote(page, { title: 'Call Sam' });
    await expect(card(noteList(page), 'Call Sam')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Note “Call Sam” created.');
    await expect(page.getByRole('region', { name: 'New note' }).getByLabel('Title')).toHaveValue('');
  });

  test('AC-1.5 note details survive a refresh', async ({ page }) => {
    await addNote(page, { title: 'Persist me', description: 'Still here', tags: 'a, b', priority: 'High', due: '2030-01-15' });
    await page.reload();
    const note = card(noteList(page), 'Persist me');
    await expect(note).toContainText('Still here');
    await expect(note.getByRole('list', { name: 'Tags' }).getByRole('listitem')).toHaveText(['a', 'b']);
    await expect(note).toContainText('High priority');
    await expect(note.locator('time')).toHaveAttribute('datetime', '2030-01-15');
  });
});

test.describe('US-2 View and manage notes', () => {
  test('AC-2.1/2.2 all notes are listed with title, description and tags', async ({ page }) => {
    await addNote(page, { title: 'One', description: 'First', tags: 'x' });
    await addNote(page, { title: 'Two', description: 'Second', tags: 'y' });
    await addNote(page, { title: 'Three', description: 'Third', tags: 'z' });
    const list = noteList(page);
    await expect(list.getByRole('article')).toHaveCount(3);
    for (const [title, description, tag] of [['One', 'First', 'x'], ['Two', 'Second', 'y'], ['Three', 'Third', 'z']]) {
      const note = card(list, title);
      await expect(note).toContainText(description);
      await expect(note.getByRole('listitem')).toHaveText([tag]);
    }
  });

  test('AC-2.3 edits are saved and displayed in the list', async ({ page }) => {
    await addNote(page, { title: 'Draft', description: 'old', tags: 'old' });
    await cardButton(card(noteList(page), 'Draft'), 'Edit note');
    const dialog = page.getByRole('dialog', { name: 'Edit note' });
    await dialog.getByLabel('Title').fill('Final');
    await dialog.getByLabel('Description').fill('new description');
    await dialog.getByRole('textbox', { name: 'Tags' }).fill('new, shiny');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toBeHidden();
    const note = card(noteList(page), 'Final');
    await expect(note).toContainText('new description');
    await expect(note.getByRole('listitem')).toHaveText(['new', 'shiny']);
    await page.reload();
    await expect(card(noteList(page), 'Final')).toContainText('new description');
  });

  test('AC-2.4/2.5 a deleted note is removed and stays removed after refresh', async ({ page }) => {
    await addNote(page, { title: 'Keep' });
    await addNote(page, { title: 'Remove' });
    await cardButton(card(noteList(page), 'Remove'), 'Delete note');
    const dialog = page.getByRole('dialog', { name: 'Delete note?' });
    await expect(dialog).toContainText('“Remove” will be deleted.');
    await dialog.getByRole('button', { name: 'Delete note' }).click();
    await expect(card(noteList(page), 'Remove')).toHaveCount(0);
    await page.reload();
    await expect(card(noteList(page), 'Remove')).toHaveCount(0);
    await expect(card(noteList(page), 'Keep')).toBeVisible();
  });

  test('cancelling the delete dialog keeps the note', async ({ page }) => {
    await addNote(page, { title: 'Safe' });
    await cardButton(card(noteList(page), 'Safe'), 'Delete note');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(card(noteList(page), 'Safe')).toBeVisible();
  });
});

test.describe('US-3 Export and import', () => {
  test('AC-3.1 export downloads valid JSON with every note', async ({ page }) => {
    await addNote(page, { title: 'Alpha', description: 'a', tags: 't1' });
    await addNote(page, { title: 'Beta' });
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^notes-\d{4}-\d{2}-\d{2}\.json$/);
    const data = JSON.parse(await readFile(await download.path(), 'utf8'));
    expect(data.format).toBe('notes-kanban');
    expect(data.notes.map((n: { title: string }) => n.title).sort()).toEqual(['Alpha', 'Beta']);
    expect(data.notes.find((n: { title: string }) => n.title === 'Alpha')).toMatchObject({ description: 'a', tags: ['t1'] });
  });

  test('AC-3.2/3.4 importing an exported file restores every note and survives refresh', async ({ page, browser }) => {
    await addNote(page, { title: 'Exported', description: 'with data', tags: 'x, y', priority: 'Medium', due: '2031-05-01' });
    await dragToColumn(page, card(noteList(page), 'Exported'), 'In progress');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export' }).click()]);
    const content = await readFile(await download.path(), 'utf8');

    // A fresh browser profile with no notes.
    const context = await browser.newContext();
    const fresh = await context.newPage();
    await fresh.goto('/');
    await importFile(fresh, 'notes.json', content);
    await expectToast(fresh, 'Imported 1 note and 3 columns from notes.json.');
    for (const p of [false, true]) {
      if (p) await fresh.reload();
      const note = card(noteList(fresh), 'Exported');
      await expect(note).toContainText('with data');
      await expect(note.getByRole('list', { name: 'Tags' }).getByRole('listitem')).toHaveText(['x', 'y']);
      await expect(note).toContainText('Medium priority');
      await expect(note.locator('time')).toHaveAttribute('datetime', '2031-05-01');
      await expect(card(column(fresh, 'In progress'), 'Exported')).toBeVisible();
    }
    await context.close();
  });

  test('AC-3.3 an invalid file is rejected with an error and existing notes are kept', async ({ page }) => {
    await addNote(page, { title: 'Existing' });
    await importFile(page, 'broken.json', '{ "notes": [ oops');
    await expect(page.getByRole('alert')).toContainText('Import failed: The file is not valid JSON.');
    await importFile(page, 'wrong.json', JSON.stringify({ notes: [{ id: '1', description: 'no title' }] }));
    await expect(page.getByRole('alert')).toContainText('notes[0].title must be a non-empty string.');
    await expect(noteList(page).getByRole('article')).toHaveCount(1);
    await expect(card(noteList(page), 'Existing')).toBeVisible();
  });
});

test.describe('US-4 Drag notes onto the board', () => {
  test('AC-4.1/4.3 dragging from the list onto a column assigns the note', async ({ page }) => {
    await addNote(page, { title: 'Task' });
    await dragToColumn(page, card(noteList(page), 'Task'), 'To do');
    await expect(card(column(page, 'To do'), 'Task')).toBeVisible();
    await expect(card(noteList(page), 'Task').getByTestId('column-badge')).toHaveText('To do');
  });

  test('AC-4.2 dragging a board note gives visual feedback', async ({ page }) => {
    await addNote(page, { title: 'Feedback' });
    await dragToColumn(page, card(noteList(page), 'Feedback'), 'To do');
    const source = card(column(page, 'To do'), 'Feedback');
    const target = column(page, 'Done');
    const from = (await source.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 8 });
    await expect(source).toHaveClass(/is-dragging/);
    await expect(target).toHaveClass(/is-drop-target/);
    await page.mouse.up();
    await expect(card(column(page, 'Done'), 'Feedback')).toBeVisible();
    await expect(target).not.toHaveClass(/is-drop-target/);
  });

  test('AC-4.4 column assignments and order survive a refresh', async ({ page }) => {
    for (const title of ['A', 'B', 'C']) await addNote(page, { title });
    await dragToColumn(page, card(noteList(page), 'A'), 'To do');
    await dragToColumn(page, card(noteList(page), 'B'), 'To do');
    await dragToColumn(page, card(noteList(page), 'C'), 'Done');
    await page.reload();
    expect(await columnTitles(page, 'To do')).toEqual(['A', 'B']);
    expect(await columnTitles(page, 'Done')).toEqual(['C']);
  });

  test('AC-4.5 dropping outside a column leaves the note where it was', async ({ page }) => {
    await addNote(page, { title: 'Stay' });
    await dragToColumn(page, card(noteList(page), 'Stay'), 'In progress');
    await card(column(page, 'In progress'), 'Stay').dragTo(page.getByRole('banner'));
    await expect(card(column(page, 'In progress'), 'Stay')).toBeVisible();
    await card(noteList(page), 'Stay').dragTo(page.getByRole('region', { name: 'New note' }));
    await expect(card(column(page, 'In progress'), 'Stay')).toBeVisible();
    await page.reload();
    await expect(card(column(page, 'In progress'), 'Stay')).toBeVisible();
  });
});

test.describe('US-5 Columns', () => {
  test('AC-5.1 a new named column is added to the board', async ({ page }) => {
    const form = page.getByRole('form', { name: 'Add column' });
    await form.getByLabel('New column').fill('Review');
    await form.getByRole('button', { name: 'Add column' }).click();
    await expect(column(page, 'Review')).toBeVisible();
    await page.reload();
    await expect(column(page, 'Review')).toBeVisible();
  });

  test('AC-5.3 a column needs a unique name', async ({ page }) => {
    const form = page.getByRole('form', { name: 'Add column' });
    await form.getByRole('button', { name: 'Add column' }).click();
    await expect(form.getByRole('alert')).toHaveText('Column name is required.');
    await form.getByLabel('New column').fill('done');
    await form.getByRole('button', { name: 'Add column' }).click();
    await expect(form.getByRole('alert')).toContainText('already exists');
    await expect(page.locator('section.column')).toHaveCount(3);
  });

  test('AC-5.2 dragging between columns moves the note', async ({ page }) => {
    await addNote(page, { title: 'Mover' });
    await dragToColumn(page, card(noteList(page), 'Mover'), 'To do');
    await dragToColumn(page, card(column(page, 'To do'), 'Mover'), 'Done');
    await expect(card(column(page, 'To do'), 'Mover')).toHaveCount(0);
    await expect(card(column(page, 'Done'), 'Mover')).toBeVisible();
    await expect(card(noteList(page), 'Mover').getByTestId('column-badge')).toHaveText('Done');
  });
});

test.describe('US-6 Browser access', () => {
  test('the app loads and deep links fall back to the app', async ({ page }) => {
    await expect(page).toHaveTitle('Notes Kanban');
    await expect(page.getByRole('heading', { level: 1, name: 'Notes Kanban' })).toBeVisible();
    await page.goto('/some/deep/link');
    await expect(page.getByRole('heading', { level: 1, name: 'Notes Kanban' })).toBeVisible();
  });
});

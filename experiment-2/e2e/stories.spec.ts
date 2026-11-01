import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { addNote, card, column, dragToColumn, GRAB_POINT, noteList } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function exportToFile(page: Page): Promise<string> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export notes' }).click();
  return (await download).path();
}

async function importFile(page: Page, name: string, content: string) {
  await page.getByTestId('import-file').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(content),
  });
}

test.describe('creating notes', () => {
  test('a note can be created with only a title', async ({ page }) => {
    await addNote(page, { title: 'Just a title' });
    await expect(card(noteList(page), 'Just a title')).toBeVisible();
  });

  test('title, description and tags are all saved', async ({ page }) => {
    await addNote(page, { title: 'Full note', description: 'Line one\nLine two', tags: 'work, urgent' });
    await page.reload();

    const note = card(noteList(page), 'Full note');
    await expect(note.getByText('Line one')).toBeVisible();
    await expect(note.getByRole('listitem')).toHaveText(['work', 'urgent']);
  });

  test('a note without a title is not saved', async ({ page }) => {
    const form = page.getByRole('region', { name: 'Add a note' });
    await form.getByLabel('Description').fill('No title here');
    await form.getByRole('button', { name: 'Add note' }).click();

    await expect(form.getByText('Enter a title for the note.')).toBeVisible();
    await expect(noteList(page).locator('article')).toHaveCount(0);
  });

  test('a title of only spaces is rejected', async ({ page }) => {
    await addNote(page, { title: '   ' });
    await expect(noteList(page).locator('article')).toHaveCount(0);
  });

  test('a new note appears in the list with a confirmation message', async ({ page }) => {
    await addNote(page, { title: 'Announced' });
    await expect(card(noteList(page), 'Announced')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Note "Announced" created.');
  });

  test('notes survive a refresh', async ({ page }) => {
    await addNote(page, { title: 'Persistent' });
    await page.reload();
    await expect(card(noteList(page), 'Persistent')).toBeVisible();
  });
});

test.describe('managing notes in the list', () => {
  test('all notes are shown with their details', async ({ page }) => {
    await addNote(page, { title: 'First', description: 'One', tags: 'a' });
    await addNote(page, { title: 'Second', description: 'Two', tags: 'b' });

    await expect(noteList(page).locator('article')).toHaveCount(2);
    await expect(card(noteList(page), 'Second').getByText('Two')).toBeVisible();
    await expect(card(noteList(page), 'Second').getByRole('listitem')).toHaveText(['b']);
  });

  test('edits are saved and shown in the list', async ({ page }) => {
    await addNote(page, { title: 'Before', description: 'Old', tags: 'old' });
    await page.getByRole('button', { name: 'Edit Before' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Edit note' });
    await expect(dialog.getByLabel('Title')).toHaveValue('Before');
    await dialog.getByLabel('Title').fill('After');
    await dialog.getByLabel('Description').fill('New');
    await dialog.getByLabel('Tags').fill('new, shiny');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(dialog).toBeHidden();
    await page.reload();
    const note = card(noteList(page), 'After');
    await expect(note.getByText('New', { exact: true })).toBeVisible();
    await expect(note.getByRole('listitem')).toHaveText(['new', 'shiny']);
    await expect(card(noteList(page), 'Before')).toHaveCount(0);
  });

  test('an edit without a title is rejected', async ({ page }) => {
    await addNote(page, { title: 'Keep me' });
    await page.getByRole('button', { name: 'Edit Keep me' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Edit note' });
    await dialog.getByLabel('Title').fill('');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(dialog.getByText('Enter a title for the note.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await dialog.getByRole('button', { name: 'Discard changes' }).click();
    await expect(card(noteList(page), 'Keep me')).toBeVisible();
  });

  test('a deleted note is removed and stays gone after a refresh', async ({ page }) => {
    await addNote(page, { title: 'Doomed' });
    await addNote(page, { title: 'Survivor' });
    await page.getByRole('button', { name: 'Delete Doomed' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();

    await expect(card(noteList(page), 'Doomed')).toHaveCount(0);
    await page.reload();
    await expect(card(noteList(page), 'Doomed')).toHaveCount(0);
    await expect(card(noteList(page), 'Survivor')).toBeVisible();
  });

  test('cancelling a delete keeps the note', async ({ page }) => {
    await addNote(page, { title: 'Spared' });
    await page.getByRole('button', { name: 'Delete Spared' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(card(noteList(page), 'Spared')).toBeVisible();
  });
});

test.describe('export and import', () => {
  test('export downloads valid JSON containing all notes', async ({ page }) => {
    await addNote(page, { title: 'One', description: 'Desc', tags: 'x, y' });
    await addNote(page, { title: 'Two' });

    const parsed = JSON.parse(await readFile(await exportToFile(page), 'utf8'));

    expect(parsed.notes.map((note: { title: string }) => note.title)).toEqual(['One', 'Two']);
    expect(parsed.notes[0]).toMatchObject({ description: 'Desc', tags: ['x', 'y'] });
  });

  test('importing an exported file restores all data, and it survives a refresh', async ({ page }) => {
    await addNote(page, { title: 'Round trip', description: 'Kept', tags: 'one, two' });
    await page.getByRole('button', { name: 'Add column' }).scrollIntoViewIfNeeded();
    await page.getByLabel('New column name').fill('Review');
    await page.getByRole('button', { name: 'Add column' }).click();
    await dragToColumn(page, card(noteList(page), 'Round trip'), 'Review');
    await expect(card(column(page, 'Review'), 'Round trip')).toBeVisible();
    const content = await readFile(await exportToFile(page), 'utf8');

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(noteList(page).locator('article')).toHaveCount(0);

    await importFile(page, 'notes.json', content);
    await expect(page.getByRole('status')).toHaveText('Imported 1 note from notes.json.');
    await page.reload();

    const note = card(noteList(page), 'Round trip');
    await expect(note.getByText('Kept')).toBeVisible();
    await expect(note.getByRole('listitem')).toHaveText(['one', 'two']);
    await expect(card(column(page, 'Review'), 'Round trip')).toBeVisible();
  });

  test('importing does not remove existing notes or duplicate matching ones', async ({ page }) => {
    await addNote(page, { title: 'Exported' });
    const content = await readFile(await exportToFile(page), 'utf8');
    await addNote(page, { title: 'Added later' });

    await importFile(page, 'notes.json', content);

    await expect(page.getByRole('status')).toContainText('Imported 1 note');
    await expect(noteList(page).locator('article')).toHaveCount(2);
  });

  for (const [name, content, reason] of [
    ['broken JSON', '{ not json', 'It is not valid JSON.'],
    ['JSON of the wrong shape', '{"hello": "world"}', 'It is not a Notes Board export.'],
    ['a note with no title', '{"version":1,"columns":[],"notes":[{"id":"1"}]}', 'Note 1 has no title.'],
  ]) {
    test(`importing ${name} is rejected with an error`, async ({ page }) => {
      await addNote(page, { title: 'Untouched' });
      await importFile(page, 'bad.json', content);

      await expect(page.getByRole('alert').filter({ hasText: 'was not imported' })).toContainText(reason);
      await expect(noteList(page).locator('article')).toHaveCount(1);
    });
  }

  test('the same invalid file can be chosen twice', async ({ page }) => {
    await importFile(page, 'bad.json', 'nope');
    await page.getByRole('button', { name: 'Dismiss message' }).click();
    await importFile(page, 'bad.json', 'nope');
    await expect(page.getByRole('alert').filter({ hasText: 'was not imported' })).toBeVisible();
  });
});

test.describe('dragging notes onto the board', () => {
  test('a note dragged from the list appears in the column and stays in the list', async ({ page }) => {
    await addNote(page, { title: 'Dragged' });
    await dragToColumn(page, card(noteList(page), 'Dragged'), 'In progress');

    await expect(card(column(page, 'In progress'), 'Dragged')).toBeVisible();
    await expect(card(noteList(page), 'Dragged').getByText('On board: In progress')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Moved "Dragged" to In progress.');
  });

  test('dragging a note gives visual feedback', async ({ page }) => {
    await addNote(page, { title: 'Feedback' });
    await dragToColumn(page, card(noteList(page), 'Feedback'), 'To do');

    const source = card(column(page, 'To do'), 'Feedback');
    const box = (await source.boundingBox())!;
    await page.mouse.move(box.x + GRAB_POINT.sourcePosition.x, box.y + GRAB_POINT.sourcePosition.y);
    await page.mouse.down();
    await page.mouse.move(box.x + 60, box.y + 60, { steps: 5 });

    await expect(source).toHaveCSS('outline-style', 'dashed');
    await expect(column(page, 'Done')).toHaveCSS('outline-style', 'dashed');

    await page.mouse.up();
    await expect(source).toHaveCSS('outline-style', 'none');
  });

  test('the column under the pointer is highlighted until the pointer leaves it', async ({ page }) => {
    await addNote(page, { title: 'Hovering' });
    await page.getByRole('button', { name: 'Dismiss message' }).click();
    await card(noteList(page), 'Hovering').scrollIntoViewIfNeeded();
    const box = (await card(noteList(page), 'Hovering').boundingBox())!;
    await page.mouse.move(box.x + GRAB_POINT.sourcePosition.x, box.y + GRAB_POINT.sourcePosition.y);
    await page.mouse.down();
    await page.mouse.move(box.x + 60, box.y + 60, { steps: 5 });

    const target = (await column(page, 'Done').boundingBox())!;
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 5 });
    await expect(column(page, 'Done')).toHaveCSS('outline-style', 'solid');
    await expect(column(page, 'To do')).toHaveCSS('outline-style', 'dashed');

    await page.mouse.move(box.x + 60, box.y + 60, { steps: 5 });
    await expect(column(page, 'Done')).toHaveCSS('outline-style', 'dashed');

    await page.mouse.up();
    await expect(column(page, 'Done')).toHaveCSS('outline-style', 'none');
  });

  test('column assignments survive a refresh', async ({ page }) => {
    await addNote(page, { title: 'Assigned' });
    await dragToColumn(page, card(noteList(page), 'Assigned'), 'Done');
    await expect(card(column(page, 'Done'), 'Assigned')).toBeVisible();

    await page.reload();
    await expect(card(column(page, 'Done'), 'Assigned')).toBeVisible();
  });

  test('a note dropped outside a column stays where it was', async ({ page }) => {
    await addNote(page, { title: 'Stays' });
    await dragToColumn(page, card(noteList(page), 'Stays'), 'To do');
    await expect(card(column(page, 'To do'), 'Stays')).toBeVisible();

    await card(column(page, 'To do'), 'Stays').dragTo(page.getByRole('heading', { name: 'Notes Board' }), GRAB_POINT);

    await expect(card(column(page, 'To do'), 'Stays')).toBeVisible();
    await page.reload();
    await expect(card(column(page, 'To do'), 'Stays')).toBeVisible();
  });
});

test.describe('board columns', () => {
  async function addColumn(page: Page, name: string) {
    await page.getByLabel('New column name').fill(name);
    await page.getByRole('button', { name: 'Add column' }).click();
  }

  test('a new column is added to the board and survives a refresh', async ({ page }) => {
    await addColumn(page, 'Blocked');
    await expect(column(page, 'Blocked')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Column "Blocked" added.');

    await page.reload();
    await expect(column(page, 'Blocked')).toBeVisible();
  });

  test('a column needs a name that is not already taken', async ({ page }) => {
    await addColumn(page, '  ');
    await expect(page.getByText('Enter a name for the column.')).toBeVisible();

    await addColumn(page, 'done');
    await expect(page.getByText('There is already a column called "done".')).toBeVisible();
    await expect(page.getByTestId(/^column-/)).toHaveCount(3);
  });

  test('a note dragged between columns moves from one to the other', async ({ page }) => {
    await addNote(page, { title: 'Traveller' });
    await dragToColumn(page, card(noteList(page), 'Traveller'), 'To do');
    await dragToColumn(page, card(column(page, 'To do'), 'Traveller'), 'Done');

    await expect(card(column(page, 'Done'), 'Traveller')).toBeVisible();
    await expect(card(column(page, 'To do'), 'Traveller')).toHaveCount(0);
  });

  test('a note can be dragged into a newly created column', async ({ page }) => {
    await addNote(page, { title: 'Pioneer' });
    await addColumn(page, 'Fresh');
    await dragToColumn(page, card(noteList(page), 'Pioneer'), 'Fresh');
    await expect(card(column(page, 'Fresh'), 'Pioneer')).toBeVisible();
  });
});

test('saved data that cannot be read is reported and backed up', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('notes-board:v1', 'corrupted'));
  await page.reload();

  await expect(page.getByRole('alert').filter({ hasText: 'could not be read' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('notes-board:v1:damaged'))).toBe('corrupted');
});

test('a change the browser refuses to store is reported and not shown', async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await addNote(page, { title: 'Unsaved' });

  await expect(page.getByRole('alert').filter({ hasText: 'was not saved' })).toBeVisible();
  await expect(noteList(page).locator('article')).toHaveCount(0);
});

test('changes in another tab appear without a refresh', async ({ page, context }) => {
  const otherTab = await context.newPage();
  await otherTab.goto('/');
  await addNote(otherTab, { title: 'From the other tab' });

  await expect(card(noteList(page), 'From the other tab')).toBeVisible();
});

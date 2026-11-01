import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { addNote, card, column, dragToColumn, importFile, noteList } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

function addNoteForm(page: Page) {
  return page.getByRole('region', { name: 'Add a note' });
}

function headerUndo(page: Page) {
  return page.getByRole('banner').getByRole('button', { name: /^Undo/ });
}

async function pageScrollsSideways(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}

async function chooseSetting(page: Page, group: string, option: string) {
  await page.getByRole('button', { name: 'Display settings' }).click();
  await page.getByRole('group', { name: group }).getByRole('radio', { name: option, exact: true }).check();
  await page.getByRole('button', { name: 'Done' }).click();
}

test.describe('forms', () => {
  test('a note in progress survives a refresh and says so', async ({ page }) => {
    await addNoteForm(page).getByLabel('Title').fill('Half written');
    await addNoteForm(page).getByLabel('Description').fill('Still thinking');
    await page.reload();

    await expect(addNoteForm(page).getByLabel('Title')).toHaveValue('Half written');
    await expect(addNoteForm(page).getByLabel('Description')).toHaveValue('Still thinking');
    await expect(addNoteForm(page).getByText('We kept the note you were writing.')).toBeVisible();
  });

  test('the draft is cleared once the note is added', async ({ page }) => {
    await addNote(page, { title: 'Finished' });
    await page.reload();
    await expect(addNoteForm(page).getByLabel('Title')).toHaveValue('');
  });

  test('the tags hint shows how the entry will be saved', async ({ page }) => {
    const tags = addNoteForm(page).getByLabel('Tags');
    await tags.fill('work, , Work, urgent');
    await expect(tags).toHaveAccessibleDescription('This will save 2 tags: work, urgent.');
  });

  test('a form keeps what was typed when saving fails', async ({ page }) => {
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'notes-board:v1') throw new DOMException('Full', 'QuotaExceededError');
        original.call(this, key, value);
      };
    });
    await addNote(page, { title: 'Precious words' });

    await expect(page.getByRole('alert').filter({ hasText: 'was not saved' })).toBeVisible();
    await expect(addNoteForm(page).getByLabel('Title')).toHaveValue('Precious words');
  });

  test('optional fields say that they are optional', async ({ page }) => {
    await expect(addNoteForm(page).getByText('(optional)')).toHaveCount(2);
  });
});

test.describe('text', () => {
  for (const [option, percent] of [['Large', 112.5], ['Larger', 137.5], ['Largest', 200]] as const) {
    test(`the ${option} text size scales the page and is remembered`, async ({ page }) => {
      await chooseSetting(page, 'Text size', option);
      await page.reload();

      const size = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      expect(size).toBe((16 * percent) / 100);
    });
  }

  for (const [width, height, option] of [[1280, 720, 'Largest'], [320, 568, 'Larger'], [320, 568, 'Largest']] as const) {
    test(`${option} text does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await addNote(page, { title: 'A title with several words', description: 'Some description text', tags: 'one, two' });
      await chooseSetting(page, 'Text size', option);
      await dragless(page, 'A title with several words', 'To do');

      expect(await pageScrollsSideways(page)).toBe(false);
    });
  }

  async function dragless(page: Page, title: string, columnName: string) {
    await page.getByRole('combobox', { name: `Column for ${title}` }).selectOption({ label: columnName });
    await page.getByRole('button', { name: `Move ${title}` }).click();
    await expect(card(column(page, columnName), title)).toBeVisible();
  }

  test('wide spacing and the wide letter font apply together, without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await addNote(page, { title: 'Spaced out', description: 'Text with room to breathe' });
    await chooseSetting(page, 'Text spacing', 'Wide');
    await chooseSetting(page, 'Font', 'Wide letters');

    await expect(page.locator('body')).toHaveCSS('letter-spacing', /px/);
    await expect(page.locator('body')).toHaveCSS('font-family', /Verdana/);
    expect(await pageScrollsSideways(page)).toBe(false);
  });

  test('right-to-left note text gets the right direction', async ({ page }) => {
    await addNote(page, { title: 'مرحبا بالعالم' });
    const title = noteList(page).getByRole('heading', { name: 'مرحبا بالعالم' });
    expect(await title.evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
  });
});

test.describe('buttons and structure', () => {
  test('the page has one main landmark, a banner and one top-level heading', async ({ page }) => {
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('every note is a named article with grouped actions', async ({ page }) => {
    await addNote(page, { title: 'Named' });
    await expect(noteList(page).getByRole('article', { name: 'Named' })).toBeVisible();
    await expect(noteList(page).getByRole('group', { name: 'Actions for Named' }).getByRole('button')).toHaveCount(3);
  });

  test('the page title names the open dialog and is restored afterwards', async ({ page }) => {
    await page.getByRole('button', { name: 'Help' }).click();
    await expect(page).toHaveTitle('Help - Notes Board');
    await page.getByRole('button', { name: 'Close help' }).click();
    await expect(page).toHaveTitle('Notes Board');
  });

  test('the Undo button stays focusable and explains itself when there is nothing to undo', async ({ page }) => {
    await headerUndo(page).focus();
    await expect(headerUndo(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveText('There is nothing to undo yet.');
  });
});

test.describe('keyboard', () => {
  async function pickUp(page: Page, title: string) {
    await page.getByRole('button', { name: `Pick up ${title}` }).first().focus();
    await page.keyboard.press('Space');
  }

  test('a note can be picked up, carried to a column and dropped', async ({ page }) => {
    await addNote(page, { title: 'Carried' });
    await pickUp(page, 'Carried');
    await expect(page.getByRole('status')).toContainText('Picked up "Carried"');

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toHaveText(/Over To do, column 1 of 3/);
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toHaveText(/Over In progress, column 2 of 3/);
    await expect(column(page, 'In progress')).toHaveCSS('outline-style', 'solid');
    await expect(card(column(page, 'In progress'), 'Carried')).toHaveCount(0);

    await page.keyboard.press('Space');
    await expect(card(column(page, 'In progress'), 'Carried')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Moved "Carried" to In progress.');
    await expect(page.getByRole('button', { name: 'Pick up Carried' }).first()).toBeFocused();
  });

  test('moving a board card between columns keeps focus on it', async ({ page }) => {
    await addNote(page, { title: 'Sideways' });
    await dragToColumn(page, card(noteList(page), 'Sideways'), 'To do');

    const board = page.getByRole('region', { name: 'Board' });
    await board.getByRole('button', { name: 'Pick up Sideways' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    const moved = card(column(page, 'Done'), 'Sideways');
    await expect(moved).toBeVisible();
    await expect(moved.getByRole('button', { name: /^Pick up/ })).toBeFocused();
  });

  test('Esc puts the note back', async ({ page }) => {
    await addNote(page, { title: 'Returned' });
    await pickUp(page, 'Returned');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    await expect(page.getByRole('status')).toHaveText('Note put back. Nothing has moved.');
    await expect(card(column(page, 'To do'), 'Returned')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pick up Returned' })).toBeFocused();
  });

  test('tabbing away puts the note back', async ({ page }) => {
    await addNote(page, { title: 'Abandoned' });
    await pickUp(page, 'Abandoned');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('status')).toHaveText('Note put back. Nothing has moved.');
  });

  test('arrow keys do nothing until the note is picked up, and stop at the last column', async ({ page }) => {
    await addNote(page, { title: 'Still' });
    await page.getByRole('button', { name: 'Pick up Still' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toHaveText('Note "Still" created.');

    await page.keyboard.press('Space');
    for (let press = 0; press < 5; press++) await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('status')).toHaveText(/Over Done, column 3 of 3/);
  });

  test('the instructions are tied to the Pick up button', async ({ page }) => {
    await addNote(page, { title: 'Described' });
    await expect(page.getByRole('button', { name: 'Pick up Described' })).toHaveAccessibleDescription(/arrow keys/);
  });

  test('skip links reach each area, including the form', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Add a note' })).toBeFocused();
  });
});

test.describe('visual', () => {
  test('high contrast can be chosen and is remembered', async ({ page }) => {
    await chooseSetting(page, 'Colours', 'High contrast');
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  });

  test('Match my device follows the device, including a request for more contrast', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.emulateMedia({ contrast: 'more' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
  });

  test('a chosen theme ignores the device', async ({ page }) => {
    await chooseSetting(page, 'Colours', 'Light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('Reset to defaults restores every setting and says so', async ({ page }) => {
    await chooseSetting(page, 'Text size', 'Largest');
    await page.getByRole('button', { name: 'Display settings' }).click();
    await page.getByRole('button', { name: 'Reset to defaults' }).click();

    await expect(page.getByText('Display settings are back to their defaults.')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'standard');
    await expect(page.getByRole('group', { name: 'Text size' }).getByRole('radio', { name: 'Standard' })).toBeChecked();
  });

  test('messages carry an icon as well as a colour', async ({ page }) => {
    const icon = () =>
      page.locator('.status-icon').evaluate((element) => getComputedStyle(element, '::before').content);

    await addNote(page, { title: 'Marked' });
    expect(await icon()).toContain('✓');
    await importFile(page, 'bad.json', 'nope');
    await expect(page.getByRole('alert').filter({ hasText: 'not imported' })).toBeVisible();
    expect(await icon()).toContain('!');
  });

  test('saved settings of an unknown value fall back to the defaults', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('notes-board:preferences', '{"textSize":"huge","theme":7}'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'standard');
  });
});

test.describe('safety', () => {
  async function deleteNoteNamed(page: Page, title: string) {
    await page.getByRole('button', { name: `Delete ${title}` }).first().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();
  }

  test('a deleted note can be restored from the message, along with its column', async ({ page }) => {
    await addNote(page, { title: 'Rescued', tags: 'keep' });
    await dragToColumn(page, card(noteList(page), 'Rescued'), 'Done');
    await deleteNoteNamed(page, 'Rescued');
    await page.getByRole('button', { name: 'Undo this change' }).click();

    await expect(page.getByRole('status')).toHaveText('Undone: Note "Rescued" deleted.');
    await expect(page.getByRole('button', { name: 'Dismiss message' })).toBeFocused();
    await page.reload();
    await expect(card(column(page, 'Done'), 'Rescued')).toBeVisible();
  });

  test('Undo reverses changes one at a time, in reverse order', async ({ page }) => {
    await addNote(page, { title: 'First' });
    await addNote(page, { title: 'Second' });
    await page.getByLabel('New column name').fill('Mistake');
    await page.getByRole('button', { name: 'Add column' }).click();

    await headerUndo(page).click();
    await expect(column(page, 'Mistake')).toHaveCount(0);
    await headerUndo(page).click();
    await expect(card(noteList(page), 'Second')).toHaveCount(0);
    await expect(card(noteList(page), 'First')).toBeVisible();
  });

  test('an edit and an import can be undone', async ({ page }) => {
    await addNote(page, { title: 'Original' });
    await page.getByRole('button', { name: 'Edit Original' }).click();
    await page.getByRole('dialog').getByLabel('Title').fill('Changed');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await headerUndo(page).click();
    await expect(card(noteList(page), 'Original')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export notes' }).click();
    const content = await readFile(await (await download).path(), 'utf8');
    await page.getByRole('button', { name: 'Delete Original' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();
    await importFile(page, 'notes.json', content);
    await expect(card(noteList(page), 'Original')).toBeVisible();

    await headerUndo(page).click();
    await expect(card(noteList(page), 'Original')).toHaveCount(0);
  });

  test('closing an edit with changes asks first, and Keep editing keeps them', async ({ page }) => {
    await addNote(page, { title: 'Guarded' });
    await page.getByRole('button', { name: 'Edit Guarded' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Changed title');

    await page.keyboard.press('Escape');
    await expect(dialog.getByRole('alert')).toContainText('not saved');

    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    await expect(dialog.getByLabel('Title')).toHaveValue('Changed title');
    await expect(dialog.getByLabel('Title')).toBeFocused();
  });

  test('pressing Esc twice goes back to editing and loses nothing', async ({ page }) => {
    await addNote(page, { title: 'Guarded' });
    await page.getByRole('button', { name: 'Edit Guarded' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Changed title');

    await page.keyboard.press('Escape');
    await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(dialog.getByLabel('Title')).toBeFocused();
    await expect(dialog.getByLabel('Title')).toHaveValue('Changed title');
  });

  test('closing an edit with changes can discard them', async ({ page }) => {
    await addNote(page, { title: 'Guarded' });
    await page.getByRole('button', { name: 'Edit Guarded' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Changed title');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await dialog.getByRole('button', { name: 'Discard changes' }).click();

    await expect(dialog).toBeHidden();
    await expect(card(noteList(page), 'Guarded')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit Guarded' })).toBeFocused();
  });

  test('closing an edit without changes does not ask', async ({ page }) => {
    await addNote(page, { title: 'Untouched' });
    await page.getByRole('button', { name: 'Edit Untouched' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('an import that would overwrite a changed note asks first', async ({ page }) => {
    await addNote(page, { title: 'Old version' });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export notes' }).click();
    const content = await readFile(await (await download).path(), 'utf8');

    await page.getByRole('button', { name: 'Edit Old version' }).click();
    await page.getByRole('dialog').getByLabel('Title').fill('New version');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await importFile(page, 'notes.json', content);
    const prompt = page.getByRole('alertdialog', { name: 'Replace notes?' });
    await expect(prompt).toContainText('1 note');
    await expect(prompt.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await prompt.getByRole('button', { name: 'Cancel' }).click();
    await expect(card(noteList(page), 'New version')).toBeVisible();

    await importFile(page, 'notes.json', content);
    await prompt.getByRole('button', { name: 'Import and replace' }).click();
    await expect(card(noteList(page), 'Old version')).toBeVisible();
  });

  test('a file too large to store is rejected', async ({ page }) => {
    await importFile(page, 'huge.json', ' '.repeat(5 * 1024 * 1024 + 1));
    await expect(page.getByRole('alert').filter({ hasText: 'too large' })).toBeVisible();
  });

  test('nothing on the page moves, flashes or times out by itself', async ({ page }) => {
    await addNote(page, { title: 'Calm' });
    const animations = await page.evaluate(() => document.getAnimations().length);
    expect(animations).toBe(0);

    await page.waitForTimeout(1500);
    await expect(page.getByRole('status')).toHaveText('Note "Calm" created.');
  });
});

test.describe('task completion', () => {
  test.beforeEach(async ({ page }) => {
    await addNote(page, { title: 'Buy milk', description: 'Semi-skimmed', tags: 'shopping' });
    await addNote(page, { title: 'Call the bank', tags: 'finance' });
    await addNote(page, { title: 'Pay rent', tags: 'finance' });
  });

  for (const [field, query, expected] of [['title', 'BANK', 1], ['description', 'skimmed', 1], ['tag', 'finance', 2]] as const) {
    test(`search finds notes by ${field}, and reports how many`, async ({ page }) => {
      await page.getByLabel('Search notes').fill(query);
      await expect(noteList(page).locator('article')).toHaveCount(expected);
      await expect(noteList(page).getByText(`Showing ${expected} of 3 notes`)).toBeVisible();
    });
  }

  test('a search with no results says what to try, and can be cleared', async ({ page }) => {
    await page.getByLabel('Search notes').fill('zebra');
    await expect(noteList(page).getByText('No notes match your search.')).toBeVisible();

    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(noteList(page).locator('article')).toHaveCount(3);
    await expect(page.getByLabel('Search notes')).toBeFocused();
  });

  test('search does not change what is on the board', async ({ page }) => {
    await dragToColumn(page, card(noteList(page), 'Pay rent'), 'To do');
    await page.getByLabel('Search notes').fill('milk');
    await expect(card(column(page, 'To do'), 'Pay rent')).toBeVisible();
  });

  test('focus lands somewhere sensible if a search hides the moved note', async ({ page }) => {
    await dragToColumn(page, card(noteList(page), 'Pay rent'), 'To do');
    await page.getByLabel('Search notes').fill('milk');

    const board = page.getByRole('region', { name: 'Board' });
    await board.getByRole('combobox', { name: 'Column for Pay rent' }).selectOption({ label: 'Not on board' });
    await board.getByRole('button', { name: 'Move Pay rent' }).click();

    await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeFocused();
  });

  test('the notes summary shows progress', async ({ page }) => {
    await expect(noteList(page).getByText('3 notes, 0 on the board')).toBeVisible();
    await dragToColumn(page, card(noteList(page), 'Pay rent'), 'Done');
    await expect(noteList(page).getByText('3 notes, 1 on the board')).toBeVisible();
  });

  test('help explains the steps and the keys, and returns focus', async ({ page }) => {
    await page.getByRole('button', { name: 'Help' }).click();
    const dialog = page.getByRole('dialog', { name: 'Help' });

    await expect(dialog.getByRole('heading', { name: 'Getting started' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Keyboard keys' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Help' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Help' })).toBeFocused();
  });
});

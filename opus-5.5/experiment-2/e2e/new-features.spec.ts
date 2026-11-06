import { expect, test, type Locator, type Page } from '@playwright/test';
import { addNote, card, column, dragByMouse, dragToColumn, importFile, noteList, waitForAnimations } from './helpers';

/** A fixed day for due date tests: Wednesday 4 November 2026. */
const TODAY = new Date(2026, 10, 4, 12);

interface FullNote {
  title: string;
  priority?: string;
  dueDate?: string;
  tags?: string;
}

async function addFullNote(page: Page, { title, priority = 'No priority', dueDate = '', tags = '' }: FullNote) {
  const form = page.getByRole('region', { name: 'Add a note' });
  await form.getByLabel('Title').fill(title);
  await form.getByLabel('Tags').fill(tags);
  await form.getByLabel('Priority').selectOption({ label: priority });
  await form.getByLabel('Due date').fill(dueDate);
  await form.getByRole('button', { name: 'Add note' }).click();
  await expect(card(noteList(page), title)).toBeVisible();
}

async function putInColumn(page: Page, title: string, columnName: string) {
  await page.getByRole('combobox', { name: `Column for ${title}` }).selectOption({ label: columnName });
  await page.getByRole('button', { name: `Move ${title}` }).click();
  await expect(card(column(page, columnName), title)).toBeVisible();
  await waitForAnimations(page);
}

async function chooseSetting(page: Page, group: string, option: string) {
  await page.getByRole('button', { name: 'Display settings' }).click();
  await page.getByRole('group', { name: group }).getByRole('radio', { name: option, exact: true }).check();
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
}

function boardTitles(page: Page, columnName: string) {
  return column(page, columnName).getByRole('heading', { level: 4 });
}

function listTitles(page: Page) {
  return noteList(page).getByRole('heading', { level: 3 });
}

function openMenu(page: Page, scope: Locator, title: string) {
  return scope.getByRole('button', { name: `More actions for ${title}` }).click();
}

test.describe('1. priority levels and coloured tags', () => {
  test.beforeEach(async ({ page }) => page.goto('/'));

  test('a priority is saved, shown in words and survives a refresh', async ({ page }) => {
    await addFullNote(page, { title: 'Ship it', priority: 'High priority' });
    await putInColumn(page, 'Ship it', 'To do');
    await page.reload();

    await expect(card(noteList(page), 'Ship it').getByText('High priority')).toBeVisible();
    await expect(card(column(page, 'To do'), 'Ship it').getByText('High priority')).toBeVisible();
  });

  test('a priority can be changed in the edit dialog', async ({ page }) => {
    await addFullNote(page, { title: 'Ship it', priority: 'High priority' });
    await page.getByRole('button', { name: 'Edit Ship it' }).click();
    await page.getByRole('dialog').getByLabel('Priority').selectOption({ label: 'Low priority' });
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(card(noteList(page), 'Ship it').getByText('Low priority')).toBeVisible();
  });

  test('each priority has its own icon shape, not just its own colour', async ({ page }) => {
    await addFullNote(page, { title: 'High', priority: 'High priority' });
    await addFullNote(page, { title: 'Low', priority: 'Low priority' });
    const shape = (title: string) =>
      card(noteList(page), title).locator('.badge svg').evaluate((icon) => icon.innerHTML);
    expect(await shape('High')).not.toEqual(await shape('Low'));
  });

  test('the same tag gets the same colour everywhere, and different tags can differ', async ({ page }) => {
    await addFullNote(page, { title: 'One', tags: 'work, home' });
    await addFullNote(page, { title: 'Two', tags: 'Work' });
    const colour = (title: string, tag: string) =>
      card(noteList(page), title).getByRole('listitem').filter({ hasText: tag }).evaluate((element) => element.className);

    expect(await colour('One', 'work')).toEqual(await colour('Two', 'Work'));
    expect(await colour('One', 'work')).toMatch(/tag-\d/);
  });

  test('a file exported before priorities and due dates existed still imports', async ({ page }) => {
    const oldExport = {
      version: 1,
      columns: [{ id: 'todo', name: 'To do' }],
      notes: [
        {
          id: 'old',
          title: 'From before',
          description: '',
          tags: [],
          columnId: 'todo',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    await importFile(page, 'old.json', JSON.stringify(oldExport));
    await expect(card(column(page, 'To do'), 'From before')).toBeVisible();
  });

  test('an unknown priority in a file is rejected', async ({ page }) => {
    const file = {
      version: 1,
      columns: [],
      notes: [{ id: 'x', title: 'Bad', description: '', tags: [], columnId: null, createdAt: '', updatedAt: '', priority: 'extreme' }],
    };
    await importFile(page, 'bad.json', JSON.stringify(file));
    await expect(page.getByRole('alert').filter({ hasText: 'priority' })).toBeVisible();
  });
});

test.describe('2. messages that hide themselves, with Undo', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: TODAY });
    await page.goto('/');
  });

  test('a message hides after 10 seconds, and Undo still works afterwards', async ({ page }) => {
    await addNote(page, { title: 'Fleeting' });
    await expect(page.getByRole('status')).toHaveText('Note "Fleeting" created.');
    await expect(page.getByRole('button', { name: 'Undo this change' })).toBeVisible();

    await page.clock.fastForward(10_500);
    await expect(page.getByRole('status')).toHaveText('');

    await page.getByRole('banner').getByRole('button', { name: /^Undo/ }).click();
    await expect(card(noteList(page), 'Fleeting')).toHaveCount(0);
  });

  test('pointing at a message keeps it until the pointer leaves', async ({ page }) => {
    await addNote(page, { title: 'Held open' });
    await page.locator('.status-bar').hover();
    await page.clock.fastForward(30_000);
    await expect(page.getByRole('status')).toHaveText('Note "Held open" created.');

    await page.mouse.move(600, 10);
    await page.clock.fastForward(10_500);
    await expect(page.getByRole('status')).toHaveText('');
  });

  test('focus on a message keeps it', async ({ page }) => {
    await addNote(page, { title: 'Focused' });
    await page.getByRole('button', { name: 'Undo this change' }).focus();
    await page.clock.fastForward(30_000);
    await expect(page.getByRole('status')).toHaveText('Note "Focused" created.');
  });

  test('error messages never hide themselves', async ({ page }) => {
    await importFile(page, 'bad.json', 'nope');
    await page.clock.fastForward(60_000);
    await expect(page.getByRole('alert').filter({ hasText: 'not imported' })).toBeVisible();
  });

  test('messages can be kept until dismissed, or given 30 seconds', async ({ page }) => {
    await chooseSetting(page, 'Messages', 'Keep until I dismiss them');
    await addNote(page, { title: 'Kept' });
    await page.clock.fastForward(120_000);
    await expect(page.getByRole('status')).toHaveText('Note "Kept" created.');

    await chooseSetting(page, 'Messages', 'Hide after 30 seconds');
    await addNote(page, { title: 'Thirty' });
    await page.clock.fastForward(20_000);
    await expect(page.getByRole('status')).toHaveText('Note "Thirty" created.');
    await page.clock.fastForward(11_000);
    await expect(page.getByRole('status')).toHaveText('');
  });
});

test.describe('3. dialogs for editing and deleting', () => {
  test.beforeEach(async ({ page }) => page.goto('/'));

  test('editing happens in a modal dialog that names itself', async ({ page }) => {
    await addNote(page, { title: 'In a dialog' });
    await page.getByRole('button', { name: 'Edit In a dialog' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit note' })).toBeVisible();
    expect(await page.locator('dialog').evaluate((dialog) => dialog.matches(':modal'))).toBe(true);
  });

  test('deleting a column asks first, keeps its notes and can be undone', async ({ page }) => {
    await addNote(page, { title: 'Survivor' });
    await putInColumn(page, 'Survivor', 'Done');
    await page.getByRole('button', { name: 'More actions for column Done' }).click();
    await page.getByRole('menuitem', { name: 'Delete column' }).click();

    const prompt = page.getByRole('alertdialog', { name: 'Delete column?' });
    await expect(prompt).toContainText('taken off the board, not deleted');
    await expect(prompt.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await prompt.getByRole('button', { name: 'Delete column' }).click();

    await expect(column(page, 'Done')).toHaveCount(0);
    await expect(card(noteList(page), 'Survivor').locator('.note-column')).toHaveText('Not on board');
    await expect(page.getByRole('heading', { name: 'Board', exact: true })).toBeFocused();

    await page.getByRole('button', { name: 'Undo this change' }).click();
    await expect(card(column(page, 'Done'), 'Survivor')).toBeVisible();
  });
});

test.describe('4. reordering notes within a column', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    for (const title of ['First', 'Second', 'Third']) {
      await addNote(page, { title });
      await putInColumn(page, title, 'To do');
    }
  });

  test('dragging a note onto the top half of another puts it before that note', async ({ page }) => {
    await dragByMouse(page, card(column(page, 'To do'), 'Third'), card(column(page, 'To do'), 'First'), { x: 40, y: 6 });
    await page.mouse.up();
    await expect(boardTitles(page, 'To do')).toHaveText(['Third', 'First', 'Second']);
    await expect(page.getByRole('status')).toHaveText('Moved "Third" to position 1 of 3 in To do.');

    await page.reload();
    await expect(boardTitles(page, 'To do')).toHaveText(['Third', 'First', 'Second']);
  });

  test('a line shows where the note will land while dragging', async ({ page }) => {
    await dragByMouse(page, card(column(page, 'To do'), 'Third'), card(column(page, 'To do'), 'First'), { x: 40, y: 6 });
    await expect(column(page, 'To do').locator('li.drop-before')).toHaveCount(1);
    await page.mouse.up();
  });

  test('More actions can move a note up, down, to the top and to the bottom', async ({ page }) => {
    const board = page.getByRole('region', { name: 'Board' });
    await openMenu(page, board, 'First');
    await expect(page.getByRole('menuitem', { name: 'Move up' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Move down' }).click();
    await expect(boardTitles(page, 'To do')).toHaveText(['Second', 'First', 'Third']);
    await expect(board.getByRole('button', { name: 'More actions for First' })).toBeFocused();

    await openMenu(page, board, 'First');
    await page.getByRole('menuitem', { name: 'Move to bottom' }).click();
    await expect(boardTitles(page, 'To do')).toHaveText(['Second', 'Third', 'First']);

    await openMenu(page, board, 'First');
    await page.getByRole('menuitem', { name: 'Move to top' }).click();
    await expect(boardTitles(page, 'To do')).toHaveText(['First', 'Second', 'Third']);
  });

  test('a picked-up note can be moved with the Up and Down arrow keys', async ({ page }) => {
    const board = page.getByRole('region', { name: 'Board' });
    await board.getByRole('button', { name: 'Pick up Third' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('status')).toHaveText('Position 2 of 3 in To do.');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('status')).toHaveText('Position 1 of 3 in To do.');
    await expect(column(page, 'To do').locator('li.drop-before')).toHaveCount(1);

    await page.keyboard.press('Enter');
    await expect(boardTitles(page, 'To do')).toHaveText(['Third', 'First', 'Second']);
    await expect(board.getByRole('button', { name: 'Pick up Third' })).toBeFocused();
  });

  test('reordering the board does not reorder the notes list', async ({ page }) => {
    const board = page.getByRole('region', { name: 'Board' });
    await openMenu(page, board, 'Third');
    await page.getByRole('menuitem', { name: 'Move to top' }).click();
    await expect(listTitles(page)).toHaveText(['First', 'Second', 'Third']);
  });

  test('a reorder can be undone', async ({ page }) => {
    const board = page.getByRole('region', { name: 'Board' });
    await openMenu(page, board, 'Third');
    await page.getByRole('menuitem', { name: 'Move to top' }).click();
    await page.getByRole('button', { name: 'Undo this change' }).click();
    await expect(boardTitles(page, 'To do')).toHaveText(['First', 'Second', 'Third']);
  });
});

test.describe('5. icon toolbar that appears on hover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await addNote(page, { title: 'Tooled' });
    await page.mouse.move(600, 10);
  });

  function toolbar(page: Page) {
    return card(noteList(page), 'Tooled').locator('.note-toolbar');
  }

  test('the toolbar shows on hover and on keyboard focus, and hides otherwise', async ({ page }) => {
    await expect(toolbar(page)).toHaveCSS('opacity', '0');
    await card(noteList(page), 'Tooled').hover();
    await expect(toolbar(page)).toHaveCSS('opacity', '1');

    await page.mouse.move(600, 10);
    await expect(toolbar(page)).toHaveCSS('opacity', '0');
    await page.getByRole('button', { name: 'Edit Tooled' }).focus();
    await expect(toolbar(page)).toHaveCSS('opacity', '1');
  });

  test('the toolbar can be set to show all the time', async ({ page }) => {
    await chooseSetting(page, 'Note buttons', 'Always show');
    await page.mouse.move(600, 10);
    await expect(toolbar(page)).toHaveCSS('opacity', '1');
  });

  test('every icon button has a name and a tooltip that starts with it', async ({ page }) => {
    const buttons = toolbar(page).getByRole('button');
    await expect(buttons).toHaveCount(4);
    for (const button of await buttons.all()) {
      const name = await button.getAttribute('aria-label');
      const tooltip = await button.locator('.tooltip').textContent();
      expect(name?.startsWith(tooltip ?? '?')).toBe(true);
    }
  });

  test('a tooltip appears on hover, stays while hovered, and Esc hides it (WCAG 1.4.13)', async ({ page }) => {
    const edit = page.getByRole('button', { name: 'Edit Tooled' });
    const tooltip = edit.locator('.tooltip');
    await edit.hover();
    await expect(tooltip).toBeVisible();

    await tooltip.hover();
    await expect(tooltip).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
  });
});

test.describe('6. inline editing of titles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await addNote(page, { title: 'Old name' });
  });

  async function startRename(page: Page) {
    await openMenu(page, noteList(page), 'Old name');
    await page.getByRole('menuitem', { name: 'Rename' }).click();
  }

  test('Rename turns the title into a field, and Enter saves', async ({ page }) => {
    await startRename(page);
    const field = page.getByLabel('New title');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('Old name');

    await field.fill('New name');
    await page.keyboard.press('Enter');
    await expect(card(noteList(page), 'New name')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Renamed "Old name" to "New name".');
    await expect(page.getByRole('button', { name: 'More actions for New name' })).toBeFocused();
  });

  test('Esc cancels and changes nothing', async ({ page }) => {
    await startRename(page);
    await page.getByLabel('New title').fill('Discarded');
    await page.keyboard.press('Escape');
    await expect(card(noteList(page), 'Old name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'More actions for Old name' })).toBeFocused();
  });

  test('an empty title is rejected with a message', async ({ page }) => {
    await startRename(page);
    await page.getByLabel('New title').fill('  ');
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('New title')).toHaveAccessibleDescription(/Enter a title for the note\./);
    await expect(page.getByLabel('New title')).toBeFocused();
  });

  test('double-clicking the title also starts renaming', async ({ page }) => {
    await noteList(page).getByRole('heading', { name: 'Old name' }).dblclick();
    await expect(page.getByLabel('New title')).toBeFocused();
  });

  test('a column can be renamed in the same way', async ({ page }) => {
    await page.getByRole('button', { name: 'More actions for column To do' }).click();
    await page.getByRole('menuitem', { name: 'Rename column' }).click();
    await page.getByLabel('New column name').last().fill('Backlog');
    await page.keyboard.press('Enter');
    await expect(column(page, 'Backlog')).toBeVisible();
  });
});

test.describe('7. More actions menus', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await addNote(page, { title: 'Menu note' });
  });

  test('the menu button follows the menu button pattern', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'More actions for Menu note' });
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
  });

  test('arrow keys, Home, End and letters move through the items', async ({ page }) => {
    await page.getByRole('button', { name: 'More actions for Menu note' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
    await page.keyboard.press('Home');
    await page.keyboard.press('e');
    await expect(page.getByRole('menuitem', { name: 'Edit details' })).toBeFocused();
  });

  test('a menu with no room below opens upwards, without scrolling the board', async ({ page }) => {
    const board = page.locator('.board');
    const scrollBefore = await board.evaluate((element) => element.scrollTop);
    await page.getByRole('button', { name: 'More actions for column Done' }).click();

    const menu = (await page.getByRole('menu').boundingBox())!;
    const boardBox = (await board.boundingBox())!;
    expect(menu.y + menu.height).toBeLessThanOrEqual(boardBox.y + boardBox.height);
    expect(await board.evaluate((element) => element.scrollTop)).toBe(scrollBefore);
  });

  test('Esc closes the menu and returns focus to its button', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'More actions for Menu note' });
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('Tab and clicking elsewhere close the menu', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'More actions for Menu note' });
    await trigger.click();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu')).toHaveCount(0);

    await trigger.click();
    await page.getByRole('heading', { name: 'Notes Board' }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('a menu item that opens a dialog returns focus to the menu button afterwards', async ({ page }) => {
    await page.getByRole('button', { name: 'More actions for Menu note' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'More actions for Menu note' })).toBeFocused();
  });

  test('columns can be moved left and right from their menu', async ({ page }) => {
    await page.getByRole('button', { name: 'More actions for column To do' }).click();
    await expect(page.getByRole('menuitem', { name: 'Move column left' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Move column right' }).click();

    await expect(page.getByRole('region', { name: 'Board' }).getByRole('heading', { level: 3 })).toHaveText([
      'In progress',
      'To do',
      'Done',
    ]);
    await expect(page.getByRole('button', { name: 'More actions for column To do' })).toBeFocused();
  });
});

test.describe('8. search and filters with live results', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/');
    await addFullNote(page, { title: 'Pay rent', priority: 'High priority', dueDate: '2026-11-01', tags: 'money' });
    await addFullNote(page, { title: 'Buy milk', priority: 'Low priority', dueDate: '2026-11-04', tags: 'shopping' });
    await addFullNote(page, { title: 'Call mum', tags: 'family, money' });
    await putInColumn(page, 'Call mum', 'Done');
    await page.getByRole('button', { name: 'Filters' }).click();
  });

  for (const [label, option, expected] of [
    ['Priority', 'High priority', ['Pay rent']],
    ['Tag', 'money', ['Pay rent', 'Call mum']],
    ['Board column', 'Done', ['Call mum']],
    ['Board column', 'Not on board', ['Pay rent', 'Buy milk']],
    ['Due date', 'Overdue', ['Pay rent']],
    ['Due date', 'Due today', ['Buy milk']],
    ['Due date', 'No due date', ['Call mum']],
  ] as const) {
    test(`filters by ${label.toLowerCase()}: ${option}`, async ({ page }) => {
      await noteList(page).getByLabel(label, { exact: true }).selectOption({ label: option });
      await expect(listTitles(page)).toHaveText([...expected]);
    });
  }

  test('filters combine with search, are counted, and can be cleared', async ({ page }) => {
    await noteList(page).getByLabel('Tag', { exact: true }).selectOption({ label: 'money' });
    await page.getByLabel('Search notes').fill('call');
    await expect(listTitles(page)).toHaveText(['Call mum']);
    await expect(page.getByRole('button', { name: 'Filters (1 on)' })).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(listTitles(page)).toHaveText(['Call mum']);
  });

  test('sorting orders the list', async ({ page }) => {
    const sort = noteList(page).getByLabel('Sort by');
    await sort.selectOption({ label: 'Title, A to Z' });
    await expect(listTitles(page)).toHaveText(['Buy milk', 'Call mum', 'Pay rent']);
    await sort.selectOption({ label: 'Due date, soonest first' });
    await expect(listTitles(page)).toHaveText(['Pay rent', 'Buy milk', 'Call mum']);
    await sort.selectOption({ label: 'Newest first' });
    await expect(listTitles(page)).toHaveText(['Call mum', 'Buy milk', 'Pay rent']);
  });

  test('results update as you type and are announced once typing pauses', async ({ page }) => {
    const announcer = noteList(page).locator('.visually-hidden[aria-live]');
    await page.getByLabel('Search notes').pressSequentially('milk');
    await expect(listTitles(page)).toHaveText(['Buy milk']);
    await expect(announcer).toHaveText('Found 1 note out of 3.');
  });

  test('filters change the list only, not the board', async ({ page }) => {
    await noteList(page).getByLabel('Priority', { exact: true }).selectOption({ label: 'High priority' });
    await expect(card(column(page, 'Done'), 'Call mum')).toBeVisible();
  });
});

test.describe('9. due dates', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/');
  });

  test('an overdue note says so in words, with an icon and a red border', async ({ page }) => {
    await addFullNote(page, { title: 'Late', dueDate: '2026-11-03' });
    const note = card(noteList(page), 'Late');
    await expect(note.getByText(/^Overdue: due /)).toBeVisible();
    await expect(note.locator('time')).toHaveAttribute('datetime', '2026-11-03');
    await expect(note).toHaveClass(/note-overdue/);
  });

  test('notes due today and later say so, without the overdue warning', async ({ page }) => {
    await addFullNote(page, { title: 'Now', dueDate: '2026-11-04' });
    await addFullNote(page, { title: 'Later', dueDate: '2026-12-25' });
    await expect(card(noteList(page), 'Now').getByText('Due today')).toBeVisible();
    await expect(card(noteList(page), 'Later').getByText(/^Due /)).toBeVisible();
    await expect(card(noteList(page), 'Later')).not.toHaveClass(/note-overdue/);
  });

  test('a due date can be removed', async ({ page }) => {
    await addFullNote(page, { title: 'Undated', dueDate: '2026-11-03' });
    await page.getByRole('button', { name: 'Edit Undated' }).click();
    await page.getByRole('dialog').getByLabel('Due date').fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(card(noteList(page), 'Undated').locator('time')).toHaveCount(0);
  });
});

test.describe('10. collapsible columns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await addNote(page, { title: 'Tucked away' });
    await putInColumn(page, 'Tucked away', 'To do');
  });

  test('a column collapses and expands, keeps its count, and stays collapsed after a refresh', async ({ page }) => {
    const toggle = column(page, 'To do').getByRole('button', { name: 'To do', exact: true });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(card(column(page, 'To do'), 'Tucked away')).toBeHidden();
    await expect(column(page, 'To do').getByText('1 note')).toBeVisible();

    await page.reload();
    await expect(column(page, 'To do').getByRole('button', { name: 'To do', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await column(page, 'To do').getByRole('button', { name: 'To do', exact: true }).click();
    await expect(card(column(page, 'To do'), 'Tucked away')).toBeVisible();
  });

  test('notes can still be dropped on a collapsed column', async ({ page }) => {
    await addNote(page, { title: 'Late arrival' });
    await column(page, 'Done').getByRole('button', { name: 'Done', exact: true }).click();
    await dragToColumn(page, card(noteList(page), 'Late arrival'), 'Done');
    await expect(column(page, 'Done').getByText('1 note')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Moved "Late arrival" to Done.');
  });
});

test.describe('11. animations', () => {
  test.beforeEach(async ({ page }) => page.goto('/'));

  function statusAnimation(page: Page) {
    return page.locator('.status-bar').evaluate((bar) => getComputedStyle(bar).animationName);
  }

  test('messages slide in when animation is on', async ({ page }) => {
    await chooseSetting(page, 'Animation', 'On');
    await addNote(page, { title: 'Animated' });
    expect(await statusAnimation(page)).toBe('rise-in');
  });

  test('nothing animates when animation is off', async ({ page }) => {
    await chooseSetting(page, 'Animation', 'Off');
    await addNote(page, { title: 'Still' });
    expect(await statusAnimation(page)).toBe('none');
  });

  test('Match my device follows a request for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  });

  test('moving a note with animation on still ends in the right place, with focus kept', async ({ page }) => {
    await chooseSetting(page, 'Animation', 'On');
    await addNote(page, { title: 'Glider' });
    await putInColumn(page, 'Glider', 'To do');
    const board = page.getByRole('region', { name: 'Board' });
    await board.getByRole('combobox', { name: 'Column for Glider' }).selectOption({ label: 'Done' });
    await board.getByRole('button', { name: 'Move Glider' }).click();
    await expect(card(column(page, 'Done'), 'Glider')).toBeVisible();
    await expect(card(column(page, 'Done'), 'Glider').getByRole('button', { name: /^Move/ })).toBeFocused();
  });
});

test.describe('12. sound effects', () => {
  test.beforeEach(async ({ page }) => {
    // Counts the tones the app makes.
    await page.addInitScript(() => {
      const counter = window as unknown as { tones: number };
      counter.tones = 0;
      const create = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function (this: AudioContext) {
        counter.tones++;
        return create.call(this);
      };
    });
    await page.goto('/');
  });

  const tones = (page: Page) => page.evaluate(() => (window as unknown as { tones: number }).tones);

  test('sound is off unless the user turns it on', async ({ page }) => {
    await addNote(page, { title: 'Silent' });
    expect(await tones(page)).toBe(0);
  });

  test('when turned on, actions and errors make short sounds', async ({ page }) => {
    await chooseSetting(page, 'Sound effects', 'Quiet');
    await addNote(page, { title: 'Chime' });
    expect(await tones(page)).toBeGreaterThan(0);

    const before = await tones(page);
    await importFile(page, 'bad.json', 'nope');
    await expect(page.getByRole('alert').filter({ hasText: 'not imported' })).toBeVisible();
    expect(await tones(page)).toBeGreaterThan(before);
  });
});

test.describe('13. dark mode toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
  });

  test('the toggle switches themes, says whether it is on, and is remembered', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'Dark mode' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Dark mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('the toggle shows as on when the device is dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
  });
});

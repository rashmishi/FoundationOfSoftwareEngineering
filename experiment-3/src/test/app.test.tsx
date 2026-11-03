import { render, screen, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { BOARD_KEY } from '../model/storage';
import { addNote, column, notesList, renderApp, waitForAnnouncement } from './helpers';

function stored() {
  return JSON.parse(localStorage.getItem(BOARD_KEY) ?? 'null');
}

function remount(unmount: () => void) {
  unmount();
  return renderApp();
}

async function expectNoAxeViolations() {
  // Colour contrast is checked by contrast.test.ts and the Playwright suite (jsdom cannot compute colours).
  const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
}

describe('Story 1: create notes', () => {
  it('creates a note with title, description and tags, shows it and confirms', async () => {
    const { user } = renderApp();
    await addNote(user, 'Buy milk', { description: 'Two litres', tags: 'groceries, home' });

    const card = notesList().getByRole('article', { name: 'Buy milk' });
    expect(within(card).getByText('Two litres')).toBeInTheDocument();
    expect(within(within(card).getByRole('list', { name: 'Tags' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'groceries',
      'home',
    ]);
    expect(screen.getByText('Note “Buy milk” created.')).toBeInTheDocument();
    await waitForAnnouncement('Note “Buy milk” created.');
    // Form cleared and focus back in Title for the next note.
    expect(screen.getByLabelText(/^Title/)).toHaveValue('');
    expect(screen.getByLabelText(/^Title/)).toHaveFocus();
  });

  it('does not save without a title, shows an error and focuses the field', async () => {
    const { user } = renderApp();
    await user.type(screen.getByLabelText('Description'), 'kept');
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    const title = screen.getByLabelText(/^Title/);
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription(expect.stringContaining('Enter a title for the note.'));
    expect(title).toHaveFocus();
    expect(screen.getByLabelText('Description')).toHaveValue('kept');
    expect(stored().notes).toEqual([]);
  });

  it('keeps notes after a reload', async () => {
    const { user, unmount } = renderApp();
    await addNote(user, 'Persist me', { tags: 'a' });
    remount(unmount);
    expect(notesList().getByRole('article', { name: 'Persist me' })).toBeInTheDocument();
  });
});

describe('Story 2: manage the list', () => {
  it('edits a note in a dialog and returns focus to the opener', async () => {
    const { user } = renderApp();
    await addNote(user, 'Old title');
    const titleButton = notesList().getByRole('button', { name: 'Old title' });
    await user.click(titleButton);
    const dialog = screen.getByRole('dialog', { name: 'Edit note' });
    const field = within(dialog).getByLabelText(/^Title/);
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.type(field, 'New title');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(notesList().getByRole('button', { name: 'New title' })).toHaveFocus();
    expect(stored().notes[0].title).toBe('New title');
  });

  it('closes the dialog with Escape without saving', async () => {
    const { user } = renderApp();
    await addNote(user, 'Keep');
    await user.click(notesList().getByRole('button', { name: 'Edit, note “Keep”' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(notesList().getByRole('button', { name: 'Edit, note “Keep”' })).toHaveFocus();
  });

  it('deletes after confirmation, moves focus to the next note, and Undo restores it', async () => {
    const { user, unmount } = renderApp();
    await addNote(user, 'First');
    await addNote(user, 'Second');
    await user.click(notesList().getByRole('button', { name: 'Delete, note “Second”' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete note' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Delete note' }));

    expect(notesList().queryByRole('article', { name: 'Second' })).not.toBeInTheDocument();
    await waitFor(() => expect(notesList().getByRole('button', { name: 'First' })).toHaveFocus());
    await waitForAnnouncement('Note “Second” deleted.');

    const toasts = within(screen.getByRole('region', { name: 'Notifications' }));
    await user.click(toasts.getByRole('button', { name: 'Undo, delete note “Second”' }));
    await waitFor(() => expect(notesList().getByRole('button', { name: 'Second' })).toHaveFocus());

    // Delete again and check it stays deleted after reload.
    await user.click(notesList().getByRole('button', { name: 'Delete, note “Second”' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete note' }));
    remount(unmount);
    expect(notesList().queryByRole('article', { name: 'Second' })).not.toBeInTheDocument();
  });

  it('renames a note inline with F2; Escape cancels', async () => {
    const { user } = renderApp();
    await addNote(user, 'Draft');
    notesList().getByRole('button', { name: 'Draft' }).focus();
    await user.keyboard('{F2}');
    const input = screen.getByLabelText('Note title');
    expect(input).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(notesList().getByRole('button', { name: 'Draft' })).toHaveFocus();

    await user.keyboard('{F2}');
    await user.clear(screen.getByLabelText('Note title'));
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Note title')).toHaveAccessibleDescription(expect.stringContaining('Enter a title for the note.'));
    await user.type(screen.getByLabelText('Note title'), 'Final{Enter}');
    expect(notesList().getByRole('button', { name: 'Final' })).toHaveFocus();
  });
});

describe('Story 3: export and import', () => {
  it('exports valid JSON with all notes', async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:x';
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user } = renderApp();
    await addNote(user, 'One', { tags: 't1' });
    await addNote(user, 'Two');
    await user.click(screen.getByRole('button', { name: 'Export notes' }));
    expect(click).toHaveBeenCalled();
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob!);
    });
    const data = JSON.parse(text);
    expect(data.format).toBe('notes-kanban');
    expect(data.notes.map((n: { title: string }) => n.title)).toEqual(['Two', 'One']);
    expect(data.notes[1].tags).toEqual(['t1']);
    click.mockRestore();
  });

  it('imports an exported file after confirmation and keeps it after reload', async () => {
    const { user, unmount } = renderApp();
    const file = {
      format: 'notes-kanban',
      version: 1,
      exportedAt: '2026-11-01T00:00:00.000Z',
      notes: [{ id: 'n1', title: 'Imported', description: 'd', tags: ['x'], priority: 'high', dueDate: '2026-12-24', createdAt: 'a', updatedAt: 'b' }],
      columns: [{ id: 'c1', name: 'Backlog', collapsed: false, noteIds: ['n1'] }],
    };
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File([JSON.stringify(file)], 'notes.json', { type: 'application/json' }));
    const dialog = await screen.findByRole('dialog', { name: 'Import notes' });
    expect(dialog).toHaveAccessibleDescription(expect.stringContaining('with 1 note and 1 column'));
    await user.click(within(dialog).getByRole('button', { name: 'Replace notes' }));
    expect(column('Backlog').getByRole('article', { name: 'Imported' })).toBeInTheDocument();
    expect(column('Backlog').getByText('High priority')).toBeInTheDocument();
    remount(unmount);
    expect(stored().notes[0]).toEqual(file.notes[0]);
    expect(column('Backlog').getByRole('article', { name: 'Imported' })).toBeInTheDocument();
  });

  it('rejects an invalid file with an error and leaves data unchanged', async () => {
    const { user } = renderApp();
    await addNote(user, 'Safe');
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(['{ not json'], 'bad.json', { type: 'application/json' }));
    const importButton = screen.getByRole('button', { name: 'Import notes' });
    await waitFor(() => expect(importButton).toHaveAccessibleDescription(expect.stringContaining('The file is not valid JSON.')));
    await waitForAnnouncement('Import failed. The file is not valid JSON.');
    expect(document.querySelector('[role="alert"]')!.textContent).toContain('Import failed');
    expect(notesList().getByRole('article', { name: 'Safe' })).toBeInTheDocument();
  });
});

describe('Stories 4 and 5: board', () => {
  it('moves a note to a column with the Move dialog (no dragging) and keeps it after reload', async () => {
    const { user, unmount } = renderApp();
    await addNote(user, 'Task');
    await user.click(notesList().getByRole('button', { name: 'Move to…, note “Task”' }));
    const dialog = screen.getByRole('dialog', { name: 'Move note' });
    await user.selectOptions(within(dialog).getByLabelText('Column'), 'In progress');
    // Changing the select alone does not move anything.
    expect(column('In progress').queryByRole('article')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Move' }));
    expect(column('In progress').getByRole('article', { name: 'Task' })).toBeInTheDocument();
    expect(notesList().getByText('Column: In progress')).toBeInTheDocument();
    await waitForAnnouncement('“Task” moved to In progress, position 1 of 1.');
    expect(notesList().getByRole('button', { name: 'Move to…, note “Task”' })).toHaveFocus();
    remount(unmount);
    expect(column('In progress').getByRole('article', { name: 'Task' })).toBeInTheDocument();
  });

  it('keyboard drag keeps focus on the handle, moves between columns, and reorders', async () => {
    const { user } = renderApp();
    await addNote(user, 'A');
    await addNote(user, 'B');
    // Put A in To do via keyboard drag from the list.
    const handle = notesList().getByRole('button', { name: 'Drag, note “A”' });
    handle.focus();
    await user.keyboard(' ');
    expect(handle).toHaveAttribute('aria-pressed', 'true');
    await waitForAnnouncement('Picked up “A”. Not on board.');
    await user.keyboard('{ArrowRight}');
    expect(handle).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(handle).toHaveFocus();
    await waitForAnnouncement('In progress, position 1 of 1.');
    await user.keyboard('{ArrowLeft}');
    await user.keyboard(' ');
    expect(column('To do').getByRole('article', { name: 'A' })).toBeInTheDocument();
    await waitFor(() => expect(notesList().getByRole('button', { name: 'Drag, note “A”' })).toHaveFocus());

    // Move B to To do with the dialog, then reorder A below B from the board.
    await user.click(notesList().getByRole('button', { name: 'Move to…, note “B”' }));
    await user.selectOptions(screen.getByLabelText('Column'), 'To do');
    await user.selectOptions(screen.getByLabelText('Position'), 'Position 1 (top)');
    await user.click(screen.getByRole('button', { name: 'Move' }));
    const order = () => column('To do').getAllByRole('article').map((a) => a.querySelector('.title-button')?.textContent);
    expect(order()).toEqual(['B', 'A']);

    const boardHandle = column('To do').getByRole('button', { name: 'Drag, note “B”' });
    boardHandle.focus();
    await user.keyboard(' {ArrowDown}');
    expect(boardHandle).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    await waitForAnnouncement('Already at the bottom of To do.');
    await user.keyboard(' ');
    expect(order()).toEqual(['A', 'B']);
    await waitFor(() => expect(column('To do').getByRole('button', { name: 'Drag, note “B”' })).toHaveFocus());
  });

  it('Escape cancels a keyboard move and returns the note', async () => {
    const { user } = renderApp();
    await addNote(user, 'Stay');
    const handle = notesList().getByRole('button', { name: 'Drag, note “Stay”' });
    handle.focus();
    await user.keyboard(' {ArrowRight}{Escape}');
    expect(handle).toHaveFocus();
    expect(handle).toHaveAttribute('aria-pressed', 'false');
    await waitForAnnouncement('Move cancelled. “Stay” returned off the board.');
    expect(column('To do').queryByRole('article')).not.toBeInTheDocument();
  });

  it('adds a column and rejects a duplicate name', async () => {
    const { user } = renderApp();
    const board = within(screen.getByRole('region', { name: 'Board' }));
    await user.type(board.getByLabelText(/^Column name/), 'Review');
    await user.click(board.getByRole('button', { name: 'Add column' }));
    expect(screen.getByRole('heading', { name: /^Review/, level: 3 })).toHaveFocus();
    await user.type(board.getByLabelText(/^Column name/), 'review');
    await user.click(board.getByRole('button', { name: 'Add column' }));
    expect(board.getByLabelText(/^Column name/)).toHaveAccessibleDescription(
      expect.stringContaining('A column named "Review" already exists. Choose a different name.'),
    );
  });

  it('collapses a column and exposes the state', async () => {
    const { user } = renderApp();
    const toggle = screen.getByRole('button', { name: 'Collapse, column “To do”' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    const expand = screen.getByRole('button', { name: 'Expand, column “To do”' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(expand).toHaveFocus();
  });
});

describe('Menus, search, undo, announcements', () => {
  it('menu button follows the APG pattern', async () => {
    const { user } = renderApp();
    await addNote(user, 'M');
    const button = notesList().getByRole('button', { name: 'More actions, note “M”' });
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(within(menu).getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await user.keyboard('{Home}{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { name: 'Rename' })).toHaveFocus();
    expect(within(menu).getByRole('menuitem', { name: 'Move up' })).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard('{Escape}');
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('filters live and announces the count', async () => {
    const { user } = renderApp();
    await addNote(user, 'Apples', { tags: 'fruit' });
    await addNote(user, 'Bread');
    await user.type(screen.getByLabelText('Search notes'), 'appl');
    await waitFor(() => expect(notesList().queryByRole('article', { name: 'Bread' })).not.toBeInTheDocument());
    expect(screen.getAllByText('Showing 1 of 2 notes').length).toBeGreaterThan(0);
    await waitForAnnouncement('Showing 1 of 2 notes.');
    await user.click(notesList().getByRole('button', { name: 'Clear filters' }));
    expect(notesList().getByRole('article', { name: 'Bread' })).toBeInTheDocument();
  });

  it('Ctrl+Z undoes the last change when not typing', async () => {
    const { user } = renderApp();
    await addNote(user, 'Gone');
    await user.click(notesList().getByRole('button', { name: 'Delete, note “Gone”' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete note' }));
    expect(screen.getAllByRole('button', { name: 'Undo, delete note “Gone”' })).toHaveLength(2);
    screen.getByRole('heading', { name: 'Notes' }).focus();
    await user.keyboard('{Control>}z{/Control}');
    expect(notesList().getByRole('article', { name: 'Gone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo, nothing to undo' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('announcements made while a dialog is open go to the dialog’s live region', async () => {
    const { user } = renderApp();
    await addNote(user, 'Dialog');
    await user.click(notesList().getByRole('button', { name: 'Edit, note “Dialog”' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit note' });
    await user.clear(within(dialog).getByLabelText(/^Title/));
    await user.type(within(dialog).getByLabelText('Tags'), 'x'.repeat(41));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(within(dialog).getByRole('status')).toHaveTextContent('Note not saved. 2 fields need attention.'));
    expect(within(dialog).getByLabelText(/^Title/)).toHaveFocus();
  });

  it('F8 moves focus to the newest notification and Escape returns', async () => {
    const { user } = renderApp();
    await addNote(user, 'Toast me');
    const title = screen.getByLabelText(/^Title/);
    expect(title).toHaveFocus();
    await user.keyboard('{F8}');
    expect(screen.getByRole('button', { name: 'Dismiss, Note “Toast me” created.' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(title).toHaveFocus());
  });
});

describe('Accessibility checks (axe-core)', () => {
  it('has no violations: empty, with notes on the board, with a menu and a dialog open', async () => {
    const { user } = renderApp();
    await expectNoAxeViolations();
    await addNote(user, 'Check', { description: 'desc', tags: 'one, two' });
    await user.click(notesList().getByRole('button', { name: 'Move to…, note “Check”' }));
    await user.selectOptions(screen.getByLabelText('Column'), 'Done');
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await expectNoAxeViolations();
    await user.click(notesList().getByRole('button', { name: 'More actions, note “Check”' }));
    await expectNoAxeViolations();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await expectNoAxeViolations();
  });

  it('page has a title, language and landmarks', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Notes & Kanban Board' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to board' })).toBeInTheDocument();
  });
});

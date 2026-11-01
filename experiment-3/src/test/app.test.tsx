import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from '../model/storage';
import { alertText, boardColumn, createForm, createNote, notesList, renderApp, statusText } from './helpers';

async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    // jsdom cannot compute colours/layout; contrast is verified by the token table and manual tests.
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
}

describe('US-1 create notes', () => {
  it('creates a note with title, description and tags, shows it and a message', async () => {
    const { user } = renderApp();
    await createNote(user, 'Buy milk', '2 litres', 'home, shopping');
    const item = notesList().getByRole('article', { name: 'Buy milk' });
    expect(within(item).getByText('2 litres')).toBeInTheDocument();
    expect(within(item).getByRole('list', { name: 'Tags' })).toHaveTextContent('homeshopping');
    expect(statusText()).toContain("Note 'Buy milk' created.");
    expect(createForm().getByRole('textbox', { name: /^Title/ })).toHaveValue('');
    expect(createForm().getByRole('textbox', { name: /^Title/ })).toHaveFocus();
  });

  it('does not save without a title and shows an associated error', async () => {
    const { user } = renderApp();
    await user.type(createForm().getByRole('textbox', { name: 'Description' }), 'keep me');
    await user.click(createForm().getByRole('button', { name: 'Create note' }));
    const title = createForm().getByRole('textbox', { name: /^Title/ });
    expect(screen.queryByRole('list', { name: 'Notes' })).not.toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Error: Title is required.');
    await waitFor(() => expect(title).toHaveFocus());
    expect(createForm().getByRole('textbox', { name: 'Description' })).toHaveValue('keep me');
    // Once corrected the error clears.
    await user.type(title, 'x');
    expect(title).not.toHaveAttribute('aria-invalid');
  });

  it('announces the error when the title field already has focus', async () => {
    const { user } = renderApp();
    await user.click(createForm().getByRole('textbox', { name: /^Title/ }));
    await user.keyboard('{Enter}');
    expect(alertText()).toContain('Title is required.');
  });

  it('keeps notes after a refresh', async () => {
    const { user, unmount } = renderApp();
    await createNote(user, 'Persist me', 'desc', 'tag1');
    unmount();
    renderApp();
    const item = notesList().getByRole('article', { name: 'Persist me' });
    expect(within(item).getByText('desc')).toBeInTheDocument();
    expect(within(item).getByText('tag1')).toBeInTheDocument();
  });
});

describe('US-2 manage notes', () => {
  it('edits a note and returns focus to Edit', async () => {
    const { user } = renderApp();
    await createNote(user, 'Old');
    await user.click(screen.getByRole('button', { name: 'Edit note Old' }));
    const form = within(screen.getByRole('form', { name: 'Edit note Old' }));
    const title = form.getByRole('textbox', { name: /^Title/ });
    await waitFor(() => expect(title).toHaveFocus());
    await user.clear(title);
    await user.type(title, 'New');
    await user.type(form.getByRole('textbox', { name: 'Tags' }), 'x, y');
    await user.click(form.getByRole('button', { name: 'Save' }));
    const item = notesList().getByRole('article', { name: 'New' });
    expect(within(item).getByText('y')).toBeInTheDocument();
    expect(statusText()).toContain("Note 'New' updated.");
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit note New' })).toHaveFocus());
  });

  it('rejects an empty title when editing and cancels with Escape', async () => {
    const { user } = renderApp();
    await createNote(user, 'Keep');
    await user.click(screen.getByRole('button', { name: 'Edit note Keep' }));
    const form = within(screen.getByRole('form', { name: 'Edit note Keep' }));
    await user.clear(form.getByRole('textbox', { name: /^Title/ }));
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(form.getByRole('textbox', { name: /^Title/ })).toHaveAttribute('aria-invalid', 'true');
    await user.keyboard('{Escape}');
    expect(notesList().getByRole('article', { name: 'Keep' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit note Keep' })).toHaveFocus());
  });

  it('deletes a note after confirmation; Cancel has initial focus and returns focus', async () => {
    const { user, unmount } = renderApp();
    await createNote(user, 'A');
    await createNote(user, 'B');
    await user.click(screen.getByRole('button', { name: 'Delete note A' }));
    let dialog = screen.getByRole('dialog', { name: 'Delete note?' });
    expect(dialog).toHaveAccessibleDescription("'A' will be permanently deleted.");
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete note A' })).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'Delete note A' }));
    dialog = screen.getByRole('dialog', { name: 'Delete note?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete note' }));
    expect(notesList().queryByRole('article', { name: 'A' })).not.toBeInTheDocument();
    expect(statusText()).toContain("Note 'A' deleted.");
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit note B' })).toHaveFocus());

    unmount();
    renderApp();
    expect(notesList().queryByRole('article', { name: 'A' })).not.toBeInTheDocument();
    expect(notesList().getByRole('article', { name: 'B' })).toBeInTheDocument();
  });

  it('cancels the delete dialog with Escape and returns focus', async () => {
    const { user } = renderApp();
    await createNote(user, 'Esc');
    await user.click(screen.getByRole('button', { name: 'Delete note Esc' }));
    // Browsers fire "cancel" on the dialog when Escape is pressed.
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(notesList().getByRole('article', { name: 'Esc' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete note Esc' })).toHaveFocus());
  });

  it('moves focus to the Notes heading when the last note is deleted', async () => {
    const { user } = renderApp();
    await createNote(user, 'Only');
    await user.click(screen.getByRole('button', { name: 'Delete note Only' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete note' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Notes' })).toHaveFocus());
    expect(screen.getByText('No notes yet. Create one with the form above.')).toBeInTheDocument();
  });
});

function fileInput() {
  return screen.getByLabelText('JSON file to import') as HTMLInputElement;
}

describe('US-3 export and import', () => {
  it('exports a valid JSON file with all notes', async () => {
    const { user } = renderApp();
    await createNote(user, 'Exported', 'd', 't');
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:x';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Export notes' }));
    expect(click).toHaveBeenCalled();
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob!);
    });
    const data = JSON.parse(text);
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0]).toMatchObject({ title: 'Exported', description: 'd', tags: ['t'] });
    expect(statusText()).toContain('Exported 1 note.');
    click.mockRestore();
  });

  it('asks for a file when none is chosen', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(fileInput()).toHaveAttribute('aria-invalid', 'true');
    expect(fileInput()).toHaveAccessibleDescription(/Choose a JSON file first\./);
  });

  it('rejects an invalid file and keeps existing notes', async () => {
    const { user } = renderApp();
    await createNote(user, 'Existing');
    await user.upload(fileInput(), new File(['{broken'], 'bad.json', { type: 'application/json' }));
    await user.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => expect(alertText()).toContain('Import failed: the file is not valid JSON.'));
    expect(notesList().getByRole('article', { name: 'Existing' })).toBeInTheDocument();
  });

  it('imports an exported file, preserving data and column assignments, after confirmation', async () => {
    const { user, unmount } = renderApp();
    await createNote(user, 'Existing');
    const file = {
      version: 1,
      exportedAt: '2026-10-31T00:00:00.000Z',
      columns: [{ id: 'c1', name: 'Backlog' }],
      notes: [
        {
          id: 'n1',
          title: 'Imported',
          description: 'desc',
          tags: ['a', 'b'],
          columnId: 'c1',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-02T00:00:00.000Z',
          movedAt: '2026-10-03T00:00:00.000Z',
        },
      ],
    };
    await user.upload(fileInput(), new File([JSON.stringify(file)], 'notes.json', { type: 'application/json' }));
    await user.click(screen.getByRole('button', { name: 'Import' }));
    const dialog = await screen.findByRole('dialog', { name: 'Replace current notes?' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Replace notes' }));

    expect(notesList().queryByRole('article', { name: 'Existing' })).not.toBeInTheDocument();
    expect(boardColumn('Backlog').getByRole('article', { name: 'Imported' })).toBeInTheDocument();
    expect(statusText()).toContain('Imported 1 note.');
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Notes' })).toHaveFocus());

    unmount();
    renderApp();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).notes).toEqual(file.notes);
    expect(boardColumn('Backlog').getByRole('article', { name: 'Imported' })).toBeInTheDocument();
  });
});

describe('US-4/US-5 board', () => {
  it('moves a note from the list to a column with the Column menu and Move button', async () => {
    const { user, unmount } = renderApp();
    await createNote(user, 'Task');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Column for Task' }), 'In progress');
    // Changing the select alone does nothing.
    expect(boardColumn('In progress').queryByRole('article')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Move Task' }));
    expect(boardColumn('In progress').getByRole('article', { name: 'Task' })).toBeInTheDocument();
    expect(notesList().getByText('Board column: In progress')).toBeInTheDocument();
    expect(statusText()).toContain("Moved 'Task' to In progress.");
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Task' })).toHaveFocus());

    unmount();
    renderApp();
    expect(boardColumn('In progress').getByRole('article', { name: 'Task' })).toBeInTheDocument();
  });

  it('moves a note between columns from a board card and keeps focus on the moved card', async () => {
    const { user } = renderApp();
    await createNote(user, 'Task');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Column for Task' }), 'To do');
    await user.click(screen.getByRole('button', { name: 'Move Task' }));
    const select = screen.getByRole('combobox', { name: 'Column for Task (To do column)' });
    await user.selectOptions(select, 'Done');
    await user.click(screen.getByRole('button', { name: 'Move Task (To do column)' }));
    expect(boardColumn('To do').queryByRole('article')).not.toBeInTheDocument();
    expect(boardColumn('Done').getByRole('article', { name: 'Task' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Task (Done column)' })).toHaveFocus());
  });

  it('supports keyboard drag-and-drop with announcements and focus on the dropped card', async () => {
    const { user } = renderApp();
    await createNote(user, 'Task');
    const handle = screen.getByRole('button', { name: 'Drag Task' });
    expect(handle).toHaveAccessibleDescription(/Press Space or Enter to pick up the note/);
    handle.focus();
    await user.keyboard(' ');
    expect(handle).toHaveAttribute('aria-pressed', 'true');
    expect(statusText()).toContain("Picked up 'Task'");
    await user.keyboard('{ArrowRight}');
    expect(statusText()).toContain('To do, column 1 of 3.');
    await user.keyboard('{ArrowRight}');
    expect(statusText()).toContain('In progress, column 2 of 3.');
    expect(screen.getByText('Drop here')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(boardColumn('In progress').getByRole('article', { name: 'Task' })).toBeInTheDocument();
    expect(statusText()).toContain("Moved 'Task' to In progress.");
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Drag Task (In progress column)' })).toHaveFocus(),
    );
  });

  it('keeps the original column when a keyboard drag is cancelled or tabbed away from', async () => {
    const { user } = renderApp();
    await createNote(user, 'Task');
    const handle = screen.getByRole('button', { name: 'Drag Task' });
    handle.focus();
    await user.keyboard(' {ArrowRight}{Escape}');
    expect(handle).toHaveFocus();
    expect(handle).toHaveAttribute('aria-pressed', 'false');
    expect(statusText()).toContain("Move cancelled. 'Task' stays off the board.");
    await user.keyboard(' {ArrowRight}');
    await user.tab();
    expect(handle).not.toHaveFocus();
    expect(handle).toHaveAttribute('aria-pressed', 'false');
    expect(boardColumn('To do').queryByRole('article')).not.toBeInTheDocument();
  });

  it('adds columns and validates the name', async () => {
    const { user, unmount } = renderApp();
    const form = within(screen.getByRole('form', { name: 'Add column' }));
    const input = form.getByRole('textbox', { name: 'Column name' });
    await user.click(form.getByRole('button', { name: 'Add column' }));
    expect(input).toHaveAccessibleDescription('Error: Column name is required.');
    await user.type(input, 'done');
    await user.click(form.getByRole('button', { name: 'Add column' }));
    expect(input).toHaveAccessibleDescription('Error: A column with this name already exists.');
    await user.clear(input);
    await user.type(input, 'Review');
    await user.click(form.getByRole('button', { name: 'Add column' }));
    expect(boardColumn('Review').getByText('No notes in this column.')).toBeInTheDocument();
    expect(statusText()).toContain("Column 'Review' added.");
    unmount();
    renderApp();
    expect(boardColumn('Review')).toBeTruthy();
  });
});

describe('messages', () => {
  it('moves focus to the Create note heading when a message is dismissed', async () => {
    const { user } = renderApp();
    await createNote(user, 'Hello');
    await user.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(statusText()).toBe('');
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Create note' })).toHaveFocus());
    expect(document.activeElement).not.toBe(document.body);
  });
});

describe('persistence errors', () => {
  it('shows a persistent banner when saved data is corrupted', async () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    renderApp();
    await waitFor(() => expect(alertText()).toContain('Saved notes could not be loaded.'));
    expect(screen.getByRole('button', { name: 'Dismiss warning' })).toBeInTheDocument();
  });
});

describe('accessibility (axe-core)', () => {
  it('has no violations when empty', async () => {
    const { container } = renderApp();
    await expectNoAxeViolations(container);
  });

  it('has no violations with notes, errors and a board card', async () => {
    const { user, container } = renderApp();
    await createNote(user, 'One', 'desc', 'a, b');
    await createNote(user, 'Two');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Column for One' }), 'Done');
    await user.click(screen.getByRole('button', { name: 'Move One' }));
    await user.click(createForm().getByRole('button', { name: 'Create note' }));
    await user.click(screen.getByRole('button', { name: 'Edit note Two' }));
    await expectNoAxeViolations(container);
  });

  it('has no violations with the delete dialog open', async () => {
    const { user } = renderApp();
    await createNote(user, 'One');
    await user.click(screen.getByRole('button', { name: 'Delete note One' }));
    await act(async () => {});
    await expectNoAxeViolations(document.body);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  });
});

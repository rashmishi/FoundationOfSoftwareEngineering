import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { NotesProvider } from './state/NotesContext';
import { buildExport } from './state/importExport';
import { STORAGE_KEY } from './state/storage';

function renderApp() {
  return render(
    <NotesProvider>
      <App />
    </NotesProvider>,
  );
}

/** Simulates a browser refresh: tear down the React tree and mount a fresh one from localStorage. */
function refresh(view: ReturnType<typeof render>) {
  view.unmount();
  return renderApp();
}

async function createNote(
  user: ReturnType<typeof userEvent.setup>,
  { title, description = '', tags = '' }: { title: string; description?: string; tags?: string },
) {
  const form = screen.getByRole('form', { name: 'New note' });
  if (title) await user.type(within(form).getByLabelText(/Title/), title);
  if (description) await user.type(within(form).getByLabelText('Description'), description);
  if (tags) await user.type(within(form).getByLabelText('Tags'), tags);
  await user.click(within(form).getByRole('button', { name: 'Add note' }));
}

const noteList = () => screen.getByRole('list', { name: /All notes/ });
const listItem = (title: string) => screen.getByRole('article', { name: title }).closest('li')!;
const column = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) });

function mockDataTransfer() {
  const data: Record<string, string> = {};
  return {
    setData: (type: string, value: string) => {
      data[type] = value;
    },
    getData: (type: string) => data[type] ?? '',
    get types() {
      return Object.keys(data);
    },
    effectAllowed: 'all',
    dropEffect: 'none',
  };
}

function dragAndDrop(source: Element, target: Element) {
  const dataTransfer = mockDataTransfer();
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragEnter(target, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  fireEvent.dragEnd(source, { dataTransfer });
}

describe('Story 1: create notes', () => {
  it('creates a note with only a title (FR-1.1)', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'Buy milk' });
    expect(within(noteList()).getByRole('heading', { name: 'Buy milk' })).toBeInTheDocument();
  });

  it('saves title, description and tags (FR-1.2) and confirms creation (FR-1.4)', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'Plan trip', description: 'Book flights', tags: 'travel, family' });
    const item = within(listItem('Plan trip'));
    expect(item.getByText('Book flights')).toBeInTheDocument();
    expect(item.getByText('travel')).toBeInTheDocument();
    expect(item.getByText('family')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Note “Plan trip” created.');
    // Form is cleared for the next note.
    expect(screen.getByRole('form', { name: 'New note' })).toHaveFormValues({});
  });

  it('does not save a note without a title (FR-1.3)', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText('Description'), 'orphan');
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    const title = screen.getByLabelText(/Title/);
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Title is required.');
    expect(title).toHaveFocus();
    expect(screen.getByText(/No notes yet/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).notes).toEqual([]);
  });

  it('keeps notes after a refresh (FR-1.5)', async () => {
    const user = userEvent.setup();
    let view = renderApp();
    await createNote(user, { title: 'Persistent', description: 'Still here', tags: 'keep' });
    view = refresh(view);
    const item = within(listItem('Persistent'));
    expect(item.getByText('Still here')).toBeInTheDocument();
    expect(item.getByText('keep')).toBeInTheDocument();
  });
});

describe('Story 2: view and manage notes', () => {
  it('lists all notes with their details (FR-2.1, FR-2.2)', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'A', description: 'alpha', tags: 'x' });
    await createNote(user, { title: 'B', description: 'beta', tags: 'y' });
    expect(within(noteList()).getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: /All notes \(2\)/ })).toBeInTheDocument();
    expect(within(listItem('B')).getByText('beta')).toBeInTheDocument();
  });

  it('edits a note and shows the changes after refresh (FR-2.3)', async () => {
    const user = userEvent.setup();
    let view = renderApp();
    await createNote(user, { title: 'Draft', description: 'old', tags: 'one' });
    await user.click(screen.getByRole('button', { name: 'Edit “Draft”' }));

    const form = screen.getByRole('form', { name: 'Edit note “Draft”' });
    const title = within(form).getByLabelText(/Title/);
    expect(title).toHaveFocus();
    await user.clear(title);
    await user.type(title, 'Final');
    await user.clear(within(form).getByLabelText('Description'));
    await user.type(within(form).getByLabelText('Description'), 'new');
    await user.clear(within(form).getByLabelText('Tags'));
    await user.type(within(form).getByLabelText('Tags'), 'two, three');
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(screen.getByRole('button', { name: 'Edit “Final”' })).toHaveFocus();
    view = refresh(view);
    const item = within(listItem('Final'));
    expect(item.getByText('new')).toBeInTheDocument();
    expect(item.getByText('two')).toBeInTheDocument();
    expect(item.queryByText('one')).not.toBeInTheDocument();
  });

  it('rejects an edit that clears the title, and cancel discards changes', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'Keep me' });
    await user.click(screen.getByRole('button', { name: 'Edit “Keep me”' }));
    const form = screen.getByRole('form', { name: 'Edit note “Keep me”' });
    await user.clear(within(form).getByLabelText(/Title/));
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));
    expect(within(form).getByText('Title is required.')).toBeInTheDocument();
    await user.click(within(form).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('article', { name: 'Keep me' })).toBeInTheDocument();
  });

  it('deletes a note, including after refresh (FR-2.4, FR-2.5)', async () => {
    const user = userEvent.setup();
    let view = renderApp();
    await createNote(user, { title: 'Doomed' });
    await createNote(user, { title: 'Survivor' });
    await user.click(screen.getByRole('button', { name: 'Delete “Doomed”' }));
    expect(screen.queryByRole('article', { name: 'Doomed' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /All notes \(1\)/ })).toHaveFocus();
    view = refresh(view);
    expect(screen.queryByRole('article', { name: 'Doomed' })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Survivor' })).toBeInTheDocument();
  });
});

describe('Story 3: export and import JSON', () => {
  it('downloads a valid JSON file with all notes (FR-3.1)', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'Export me', tags: 'json' });

    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:mock';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toMatch(/^notes-\d{4}-\d{2}-\d{2}\.json$/);
    });

    await user.click(screen.getByRole('button', { name: 'Export JSON' }));
    expect(click).toHaveBeenCalledOnce();
    const parsed = JSON.parse(await blob!.text());
    expect(parsed).toMatchObject({ app: 'notes-kanban', version: 1 });
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0]).toMatchObject({ title: 'Export me', tags: ['json'] });
    expect(screen.getByRole('status')).toHaveTextContent('Exported 1 note');
  });

  it('imports an exported file, preserving data across refresh (FR-3.2, FR-3.4)', async () => {
    const user = userEvent.setup();
    let view = renderApp();
    const file = buildExport({
      columns: [{ id: 'review', name: 'Review' }],
      notes: [
        {
          id: 'imp-1',
          title: 'Imported',
          description: 'from file',
          tags: ['restored'],
          columnId: 'review',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
    await user.upload(
      screen.getByTestId('import-input'),
      new File([JSON.stringify(file)], 'backup.json', { type: 'application/json' }),
    );
    expect(await screen.findByText('Imported 1 note from backup.json.')).toBeInTheDocument();
    expect(within(column('Review')).getByRole('heading', { name: 'Imported' })).toBeInTheDocument();

    view = refresh(view);
    expect(within(listItem('Imported')).getByText('from file')).toBeInTheDocument();
    expect(within(column('Review')).getByText('restored')).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.notes[0]).toEqual(file.notes[0]);
  });

  it('rejects an invalid file with an error and changes nothing (FR-3.3)', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'Existing' });
    await user.upload(
      screen.getByTestId('import-input'),
      new File(['{ definitely not json'], 'broken.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Import failed: The file is not valid JSON. No notes were changed.',
    );
    expect(within(noteList()).getAllByRole('article')).toHaveLength(1);
  });
});

describe('Story 4: drag notes onto the board', () => {
  it('drops a list note onto a column and keeps it there after refresh (FR-4.1, FR-4.3, FR-4.4)', async () => {
    const user = userEvent.setup();
    let view = renderApp();
    await createNote(user, { title: 'Drag me' });
    dragAndDrop(listItem('Drag me'), column('In Progress'));

    expect(within(column('In Progress')).getByRole('heading', { name: 'Drag me' })).toBeInTheDocument();
    expect(within(listItem('Drag me')).getByText('In Progress', { selector: '.badge' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('“Drag me” moved to In Progress.');

    view = refresh(view);
    expect(within(column('In Progress')).getByRole('heading', { name: 'Drag me' })).toBeInTheDocument();
  });

  it('gives visual feedback while dragging (FR-4.2)', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'Feedback' });
    dragAndDrop(listItem('Feedback'), column('To Do'));

    const card = within(column('To Do')).getByRole('heading', { name: 'Feedback' }).closest('li')!;
    const target = column('Done');
    const dataTransfer = mockDataTransfer();
    fireEvent.dragStart(card, { dataTransfer });
    expect(card).toHaveClass('is-dragging');
    expect(card).toHaveAttribute('draggable', 'true');
    fireEvent.dragEnter(target, { dataTransfer });
    expect(target).toHaveClass('is-drop-target');
    fireEvent.dragLeave(target, { dataTransfer });
    expect(target).not.toHaveClass('is-drop-target');
    fireEvent.dragEnd(card, { dataTransfer });
    expect(card).not.toHaveClass('is-dragging');
  });

  it('leaves the note in its column when dropped outside any column (FR-4.5)', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'Stay' });
    dragAndDrop(listItem('Stay'), column('Done'));
    const card = within(column('Done')).getByRole('heading', { name: 'Stay' }).closest('li')!;

    dragAndDrop(card, screen.getByRole('complementary', { name: 'Notes' }));
    dragAndDrop(card, screen.getByRole('heading', { name: 'Notes Kanban' }));

    expect(within(column('Done')).getByRole('heading', { name: 'Stay' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).notes[0].columnId).toBe('done');
  });

  it('ignores drags that are not notes', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'Untouched' });
    const dataTransfer = mockDataTransfer();
    dataTransfer.setData('text/plain', 'random text');
    fireEvent.dragEnter(column('To Do'), { dataTransfer });
    expect(column('To Do')).not.toHaveClass('is-drop-target');
    fireEvent.drop(column('To Do'), { dataTransfer });
    expect(within(column('To Do')).getByText('Drop notes here')).toBeInTheDocument();
  });

  it('offers a non-drag alternative to move notes (NFR-2)', async () => {
    const user = userEvent.setup();
    renderApp();
    await createNote(user, { title: 'Keyboard' });
    await user.selectOptions(within(listItem('Keyboard')).getByLabelText('Column for “Keyboard”'), 'Done');
    expect(within(column('Done')).getByRole('heading', { name: 'Keyboard' })).toBeInTheDocument();
    await user.selectOptions(within(column('Done')).getByLabelText('Column for “Keyboard”'), 'Unassigned');
    expect(within(column('Done')).queryByRole('heading', { name: 'Keyboard' })).not.toBeInTheDocument();
  });
});

describe('Story 5: create columns and move notes between them', () => {
  it('adds a named column that persists (FR-5.1)', async () => {
    const user = userEvent.setup();
    let view = renderApp();
    await user.type(screen.getByLabelText('New column name'), 'Blocked');
    await user.click(screen.getByRole('button', { name: 'Add column' }));
    expect(column('Blocked')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Column “Blocked” added.');
    view = refresh(view);
    expect(column('Blocked')).toBeInTheDocument();
  });

  it('rejects an empty column name', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Add column' }));
    expect(screen.getByLabelText('New column name')).toHaveAccessibleDescription('Column name is required.');
    expect(screen.getAllByRole('region')).toHaveLength(3 + 3); // 3 columns + New note, All notes, Board
  });

  it('moves a card from one column to another (FR-5.2)', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText('New column name'), 'Review');
    await user.click(screen.getByRole('button', { name: 'Add column' }));
    await createNote(user, { title: 'Hop' });
    dragAndDrop(listItem('Hop'), column('To Do'));
    const card = within(column('To Do')).getByRole('heading', { name: 'Hop' }).closest('li')!;
    dragAndDrop(card, column('Review'));

    expect(within(column('To Do')).queryByRole('heading', { name: 'Hop' })).not.toBeInTheDocument();
    expect(within(column('Review')).getByRole('heading', { name: 'Hop' })).toBeInTheDocument();
  });
});

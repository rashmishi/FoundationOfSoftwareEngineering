import {
  createInitialState,
  mergeImport,
  notesReducer,
  parseTags,
  validateColumnName,
  validateTitle,
} from './notesReducer';
import type { AppState } from '../types';

const NOW = '2026-10-30T10:00:00.000Z';

function withNote(state = createInitialState()): AppState {
  return notesReducer(state, {
    type: 'addNote',
    id: 'n1',
    now: NOW,
    note: { title: 'First', description: 'Desc', tags: ['a', 'b'] },
  });
}

describe('parseTags', () => {
  it('trims, drops empties and de-duplicates case-insensitively', () => {
    expect(parseTags(' work, urgent ,, Work,home ')).toEqual(['work', 'urgent', 'home']);
  });
  it('returns an empty list for blank input', () => {
    expect(parseTags('  ')).toEqual([]);
  });
});

describe('validation', () => {
  it('requires a non-blank title (FR-1.3)', () => {
    expect(validateTitle('')).toMatch(/required/);
    expect(validateTitle('   ')).toMatch(/required/);
    expect(validateTitle('ok')).toBeNull();
  });
  it('requires a unique, non-blank column name (FR-5.1)', () => {
    const { columns } = createInitialState();
    expect(validateColumnName(' ', columns)).toMatch(/required/);
    expect(validateColumnName('done', columns)).toMatch(/already exists/);
    expect(validateColumnName('Review', columns)).toBeNull();
  });
});

describe('notesReducer', () => {
  it('starts with the three default columns (FR-5.3)', () => {
    expect(createInitialState().columns.map((c) => c.name)).toEqual(['To Do', 'In Progress', 'Done']);
  });

  it('adds a note with all fields, unassigned (FR-1.1, FR-1.2)', () => {
    const state = withNote();
    expect(state.notes).toEqual([
      {
        id: 'n1',
        title: 'First',
        description: 'Desc',
        tags: ['a', 'b'],
        columnId: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
  });

  it('ignores a note without a title (FR-1.3)', () => {
    const state = createInitialState();
    const next = notesReducer(state, { type: 'addNote', note: { title: ' ', description: '', tags: [] } });
    expect(next).toBe(state);
  });

  it('updates a note and bumps updatedAt (FR-2.3)', () => {
    const later = '2026-10-31T00:00:00.000Z';
    const state = notesReducer(withNote(), {
      type: 'updateNote',
      id: 'n1',
      now: later,
      note: { title: ' Renamed ', description: 'New', tags: ['x'] },
    });
    expect(state.notes[0]).toMatchObject({ title: 'Renamed', description: 'New', tags: ['x'], updatedAt: later, createdAt: NOW });
  });

  it('deletes a note (FR-2.4)', () => {
    expect(notesReducer(withNote(), { type: 'deleteNote', id: 'n1' }).notes).toEqual([]);
  });

  it('moves a note between columns and back to unassigned (FR-4.3, FR-5.2)', () => {
    let state = notesReducer(withNote(), { type: 'moveNote', id: 'n1', columnId: 'todo' });
    expect(state.notes[0].columnId).toBe('todo');
    state = notesReducer(state, { type: 'moveNote', id: 'n1', columnId: 'done' });
    expect(state.notes[0].columnId).toBe('done');
    state = notesReducer(state, { type: 'moveNote', id: 'n1', columnId: null });
    expect(state.notes[0].columnId).toBeNull();
  });

  it('ignores moves to a missing column', () => {
    const state = withNote();
    expect(notesReducer(state, { type: 'moveNote', id: 'n1', columnId: 'nope' })).toBe(state);
  });

  it('adds a column with a trimmed name (FR-5.1)', () => {
    const state = notesReducer(createInitialState(), { type: 'addColumn', id: 'c1', name: '  Review ' });
    expect(state.columns.at(-1)).toEqual({ id: 'c1', name: 'Review' });
  });
});

describe('mergeImport (FR-3.2)', () => {
  it('replaces same-id records, appends new ones and unassigns unknown columns', () => {
    const state = withNote();
    const merged = mergeImport(state, {
      columns: [
        { id: 'todo', name: 'Backlog' },
        { id: 'qa', name: 'QA' },
      ],
      notes: [
        { ...state.notes[0], title: 'Imported', columnId: 'qa' },
        { id: 'n2', title: 'Two', description: '', tags: [], columnId: 'ghost', createdAt: NOW, updatedAt: NOW },
      ],
    });
    expect(merged.columns.map((c) => c.name)).toEqual(['Backlog', 'In Progress', 'Done', 'QA']);
    expect(merged.notes.map((n) => [n.id, n.title, n.columnId])).toEqual([
      ['n1', 'Imported', 'qa'],
      ['n2', 'Two', null],
    ]);
  });
});

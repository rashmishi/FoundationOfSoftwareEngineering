import { describe, expect, it } from 'vitest';
import type { BoardState } from '../types';
import { boardReducer, notePosition } from './boardReducer';
import { createColumn, createNote, defaultBoard } from './notes';

const NOW = '2026-11-02T12:00:00.000Z';

function note(id: string, title = id) {
  return createNote({ title, description: '', tags: [], priority: 'none', dueDate: null }, id, NOW);
}

/** Board with notes a–e; To do: [a, b, c], In progress: [d], e unassigned. */
function board(): BoardState {
  const state = defaultBoard();
  return {
    notes: ['a', 'b', 'c', 'd', 'e'].map((id) => note(id)),
    columns: state.columns.map((c) =>
      c.id === 'todo' ? { ...c, noteIds: ['a', 'b', 'c'] } : c.id === 'in-progress' ? { ...c, noteIds: ['d'] } : c,
    ),
  };
}

const ids = (state: BoardState, columnId: string) => state.columns.find((c) => c.id === columnId)!.noteIds;

describe('notes', () => {
  it('adds a note to the top of the list', () => {
    const next = boardReducer(board(), { type: 'addNote', note: note('z') });
    expect(next.notes[0].id).toBe('z');
    expect(next.notes).toHaveLength(6);
  });

  it('ignores a note with a duplicate id', () => {
    const state = board();
    expect(boardReducer(state, { type: 'addNote', note: note('a') })).toBe(state);
  });

  it('updates a note and bumps updatedAt', () => {
    const next = boardReducer(board(), {
      type: 'updateNote',
      id: 'a',
      changes: { title: ' New ', tags: ['x', 'X'], description: 'd' },
      now: '2026-11-03T00:00:00.000Z',
    });
    const a = next.notes.find((n) => n.id === 'a')!;
    expect(a).toMatchObject({ title: 'New', tags: ['x'], description: 'd', updatedAt: '2026-11-03T00:00:00.000Z' });
  });

  it('refuses to blank a title', () => {
    const next = boardReducer(board(), { type: 'updateNote', id: 'a', changes: { title: '  ' }, now: NOW });
    expect(next.notes.find((n) => n.id === 'a')!.title).toBe('a');
  });

  it('deletes a note from the list and its column', () => {
    const next = boardReducer(board(), { type: 'deleteNote', id: 'b' });
    expect(next.notes.map((n) => n.id)).toEqual(['a', 'c', 'd', 'e']);
    expect(ids(next, 'todo')).toEqual(['a', 'c']);
  });

  it('restores a deleted note to its list and column position', () => {
    const state = board();
    const position = notePosition(state, 'b');
    const deleted = boardReducer(state, { type: 'deleteNote', id: 'b' });
    const restored = boardReducer(deleted, { type: 'restoreNote', note: state.notes[1], listIndex: 1, ...position });
    expect(restored).toEqual(state);
  });

  it('duplicates a note just after the original', () => {
    const next = boardReducer(board(), { type: 'duplicateNote', id: 'b', newId: 'b2', now: NOW });
    expect(next.notes.map((n) => n.id)).toEqual(['a', 'b2', 'b', 'c', 'd', 'e']);
    expect(next.notes[1].title).toBe('b (copy)');
    expect(ids(next, 'todo')).toEqual(['a', 'b', 'b2', 'c']);
  });
});

describe('moveNote', () => {
  it('assigns an unassigned note to a column (end)', () => {
    const next = boardReducer(board(), { type: 'moveNote', id: 'e', columnId: 'done', beforeId: null });
    expect(ids(next, 'done')).toEqual(['e']);
  });

  it('moves a note between columns: removed from source, added to target', () => {
    const next = boardReducer(board(), { type: 'moveNote', id: 'b', columnId: 'in-progress', beforeId: 'd' });
    expect(ids(next, 'todo')).toEqual(['a', 'c']);
    expect(ids(next, 'in-progress')).toEqual(['b', 'd']);
  });

  it('reorders within a column', () => {
    const up = boardReducer(board(), { type: 'moveNote', id: 'c', columnId: 'todo', beforeId: 'a' });
    expect(ids(up, 'todo')).toEqual(['c', 'a', 'b']);
    const down = boardReducer(board(), { type: 'moveNote', id: 'a', columnId: 'todo', beforeId: null });
    expect(ids(down, 'todo')).toEqual(['b', 'c', 'a']);
  });

  it('removes a note from the board', () => {
    const next = boardReducer(board(), { type: 'moveNote', id: 'd', columnId: null, beforeId: null });
    expect(ids(next, 'in-progress')).toEqual([]);
    expect(next.notes).toHaveLength(5);
  });

  it('ignores unknown notes and columns', () => {
    const state = board();
    expect(boardReducer(state, { type: 'moveNote', id: 'nope', columnId: 'done', beforeId: null })).toBe(state);
    expect(boardReducer(state, { type: 'moveNote', id: 'a', columnId: 'nope', beforeId: null })).toBe(state);
  });

  it('is undone by moving back to the recorded position', () => {
    const state = board();
    const from = notePosition(state, 'b');
    const moved = boardReducer(state, { type: 'moveNote', id: 'b', columnId: 'done', beforeId: null });
    const back = boardReducer(moved, { type: 'moveNote', id: 'b', ...from });
    expect(back).toEqual(state);
  });
});

describe('columns', () => {
  it('adds a column at the end', () => {
    const next = boardReducer(board(), { type: 'addColumn', column: createColumn('  Review ', 'r') });
    expect(next.columns.at(-1)).toEqual({ id: 'r', name: 'Review', collapsed: false, noteIds: [] });
  });

  it('renames, collapses and moves columns', () => {
    let next = boardReducer(board(), { type: 'renameColumn', id: 'todo', name: 'Backlog' });
    next = boardReducer(next, { type: 'toggleColumn', id: 'todo' });
    next = boardReducer(next, { type: 'moveColumn', id: 'todo', offset: 1 });
    expect(next.columns.map((c) => c.id)).toEqual(['in-progress', 'todo', 'done']);
    expect(next.columns[1]).toMatchObject({ name: 'Backlog', collapsed: true });
  });

  it('does not move a column past the edge', () => {
    const state = board();
    expect(boardReducer(state, { type: 'moveColumn', id: 'todo', offset: -1 })).toBe(state);
  });

  it('deletes a column but keeps its notes', () => {
    const next = boardReducer(board(), { type: 'deleteColumn', id: 'todo' });
    expect(next.columns.map((c) => c.id)).toEqual(['in-progress', 'done']);
    expect(next.notes).toHaveLength(5);
  });

  it('restores a deleted column with its notes', () => {
    const state = board();
    const deleted = boardReducer(state, { type: 'deleteColumn', id: 'todo' });
    // Meanwhile one of its notes was placed elsewhere; restoring takes it back.
    const moved = boardReducer(deleted, { type: 'moveNote', id: 'a', columnId: 'done', beforeId: null });
    const restored = boardReducer(moved, { type: 'restoreColumn', column: state.columns[0], index: 0 });
    expect(restored.columns).toEqual(state.columns);
  });
});

describe('replace', () => {
  it('replaces the whole state', () => {
    const other = defaultBoard();
    expect(boardReducer(board(), { type: 'replace', state: other })).toBe(other);
  });
});

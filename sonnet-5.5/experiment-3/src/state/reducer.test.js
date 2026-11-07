import { describe, expect, it } from 'vitest';
import { columnOf, createNote, defaultState, reducer, sanitizeState } from './reducer.js';

function stateWithNotes(count) {
  let state = defaultState();
  for (let i = 0; i < count; i++) state = reducer(state, { type: 'ADD_NOTE', note: createNote({ title: `Note ${i + 1}` }) });
  return state;
}

describe('reducer', () => {
  it('adds, updates and deletes notes', () => {
    let state = stateWithNotes(2);
    const id = state.notes[0].id;
    state = reducer(state, { type: 'UPDATE_NOTE', id, changes: { title: 'Changed', tags: ['a'] } });
    expect(state.notes[0]).toMatchObject({ title: 'Changed', tags: ['a'] });
    state = reducer(state, { type: 'MOVE_NOTE', id, columnId: 'col_todo' });
    state = reducer(state, { type: 'DELETE_NOTE', id });
    expect(state.notes).toHaveLength(1);
    expect(columnOf(state, id)).toBeNull();
  });

  it('puts a note in a column and removes it from the previous one', () => {
    let state = stateWithNotes(1);
    const id = state.notes[0].id;
    state = reducer(state, { type: 'MOVE_NOTE', id, columnId: 'col_todo' });
    expect(columnOf(state, id).id).toBe('col_todo');
    state = reducer(state, { type: 'MOVE_NOTE', id, columnId: 'col_doing' });
    expect(columnOf(state, id).id).toBe('col_doing');
    expect(state.columns.find((c) => c.id === 'col_todo').noteIds).toEqual([]);
  });

  it('reorders inside a column', () => {
    let state = stateWithNotes(3);
    const [a, b, c] = state.notes.map((n) => n.id);
    for (const id of [a, b, c]) state = reducer(state, { type: 'MOVE_NOTE', id, columnId: 'col_todo' });
    expect(state.columns[0].noteIds).toEqual([a, b, c]);
    state = reducer(state, { type: 'MOVE_NOTE', id: a, columnId: 'col_todo', index: 3 });
    expect(state.columns[0].noteIds).toEqual([b, c, a]);
    state = reducer(state, { type: 'MOVE_NOTE', id: a, columnId: 'col_todo', index: 0 });
    expect(state.columns[0].noteIds).toEqual([a, b, c]);
  });

  it('ignores moves to unknown columns', () => {
    const state = stateWithNotes(1);
    expect(reducer(state, { type: 'MOVE_NOTE', id: state.notes[0].id, columnId: 'nope' })).toBe(state);
  });

  it('adds, renames, collapses and deletes columns', () => {
    let state = reducer(defaultState(), { type: 'ADD_COLUMN', name: '  Review ' });
    const col = state.columns.at(-1);
    expect(col.name).toBe('Review');
    state = reducer(state, { type: 'RENAME_COLUMN', id: col.id, name: 'QA' });
    state = reducer(state, { type: 'TOGGLE_COLUMN', id: col.id });
    expect(state.columns.at(-1)).toMatchObject({ name: 'QA', collapsed: true });
    state = reducer(state, { type: 'DELETE_COLUMN', id: col.id });
    expect(state.columns).toHaveLength(3);
  });

  it('restores an earlier state (undo)', () => {
    const before = stateWithNotes(1);
    const after = reducer(before, { type: 'DELETE_NOTE', id: before.notes[0].id });
    expect(reducer(after, { type: 'RESTORE', state: before })).toBe(before);
  });
});

describe('sanitizeState', () => {
  it('falls back to a fresh board for damaged data', () => {
    expect(sanitizeState(null).columns).toHaveLength(3);
    expect(sanitizeState({ notes: 'x' }).notes).toEqual([]);
  });

  it('drops references to missing or duplicate notes', () => {
    const raw = {
      notes: [{ id: 'a', title: 'A' }],
      columns: [
        { id: 'c1', name: 'One', noteIds: ['a', 'ghost'] },
        { id: 'c2', name: 'Two', noteIds: ['a'] },
      ],
    };
    const state = sanitizeState(raw);
    expect(state.columns[0].noteIds).toEqual(['a']);
    expect(state.columns[1].noteIds).toEqual([]);
  });
});

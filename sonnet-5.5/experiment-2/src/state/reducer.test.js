import { describe, expect, it } from 'vitest';
import { columnOf, createInitialState, reducer } from './reducer.js';

const note = (id, extra = {}) => ({
  id,
  title: `Note ${id}`,
  description: '',
  tags: [],
  priority: 'none',
  dueDate: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...extra,
});

function seeded() {
  let s = createInitialState();
  s = reducer(s, { type: 'note/add', note: note('a'), columnId: 'col-todo' });
  s = reducer(s, { type: 'note/add', note: note('b'), columnId: 'col-todo' });
  s = reducer(s, { type: 'note/add', note: note('c'), columnId: null });
  return s;
}

describe('notes', () => {
  it('adds new notes at the top of the list and places them in a column when asked', () => {
    const s = seeded();
    expect(s.notes.map((n) => n.id)).toEqual(['c', 'b', 'a']);
    expect(s.columns[0].noteIds).toEqual(['a', 'b']);
    expect(columnOf(s, 'c')).toBeNull();
  });

  it('updates fields and can move the note to another column at the same time', () => {
    let s = reducer(seeded(), { type: 'note/update', id: 'a', changes: { title: 'Renamed' }, columnId: 'col-done' });
    expect(s.notes.find((n) => n.id === 'a').title).toBe('Renamed');
    expect(columnOf(s, 'a').id).toBe('col-done');
    s = reducer(s, { type: 'note/update', id: 'a', changes: {}, columnId: null });
    expect(columnOf(s, 'a')).toBeNull();
  });

  it('leaves the column alone when update does not mention it', () => {
    const s = reducer(seeded(), { type: 'note/update', id: 'a', changes: { title: 'X' } });
    expect(columnOf(s, 'a').id).toBe('col-todo');
  });

  it('deletes a note from the list and from its column', () => {
    const s = reducer(seeded(), { type: 'note/delete', id: 'a' });
    expect(s.notes.map((n) => n.id)).toEqual(['c', 'b']);
    expect(s.columns[0].noteIds).toEqual(['b']);
  });
});

describe('moving notes', () => {
  it('moves a note from one column to another (removed from the first, added to the second)', () => {
    const s = reducer(seeded(), { type: 'note/move', id: 'a', columnId: 'col-doing' });
    expect(s.columns[0].noteIds).toEqual(['b']);
    expect(s.columns[1].noteIds).toEqual(['a']);
  });

  it('assigns a note that was only in the list', () => {
    const s = reducer(seeded(), { type: 'note/move', id: 'c', columnId: 'col-done' });
    expect(columnOf(s, 'c').id).toBe('col-done');
    expect(s.notes).toHaveLength(3);
  });

  it('inserts before another note, and reorders inside a column', () => {
    let s = reducer(seeded(), { type: 'note/move', id: 'c', columnId: 'col-todo', beforeId: 'b' });
    expect(s.columns[0].noteIds).toEqual(['a', 'c', 'b']);
    s = reducer(s, { type: 'note/move', id: 'b', columnId: 'col-todo', beforeId: 'a' });
    expect(s.columns[0].noteIds).toEqual(['b', 'a', 'c']);
  });

  it('returns the same state object when nothing changes', () => {
    const s = seeded();
    expect(reducer(s, { type: 'note/move', id: 'b', columnId: 'col-todo' })).toBe(s);
    expect(reducer(s, { type: 'note/move', id: 'a', columnId: 'col-todo', beforeId: 'b' })).toBe(s);
  });

  it('ignores a move to a column that does not exist', () => {
    const s = seeded();
    expect(reducer(s, { type: 'note/move', id: 'a', columnId: 'nope' })).toBe(s);
  });

  it('steps up and down but not past the ends', () => {
    let s = reducer(seeded(), { type: 'note/step', id: 'b', delta: -1 });
    expect(s.columns[0].noteIds).toEqual(['b', 'a']);
    const same = reducer(s, { type: 'note/step', id: 'b', delta: -1 });
    expect(same).toBe(s);
    s = reducer(s, { type: 'note/step', id: 'b', delta: 1 });
    expect(s.columns[0].noteIds).toEqual(['a', 'b']);
  });
});

describe('columns', () => {
  it('adds, renames, moves and collapses columns', () => {
    let s = reducer(createInitialState(), { type: 'column/add', id: 'col-x', name: 'Review' });
    expect(s.columns.at(-1)).toMatchObject({ id: 'col-x', name: 'Review', noteIds: [], collapsed: false });
    s = reducer(s, { type: 'column/rename', id: 'col-x', name: 'QA' });
    expect(s.columns.at(-1).name).toBe('QA');
    s = reducer(s, { type: 'column/move', id: 'col-x', delta: -1 });
    expect(s.columns.map((c) => c.id)).toEqual(['col-todo', 'col-doing', 'col-x', 'col-done']);
    s = reducer(s, { type: 'column/toggle', id: 'col-x' });
    expect(s.columns[2].collapsed).toBe(true);
  });

  it('keeps notes in the list when their column is deleted', () => {
    const s = reducer(seeded(), { type: 'column/delete', id: 'col-todo' });
    expect(s.notes).toHaveLength(3);
    expect(columnOf(s, 'a')).toBeNull();
  });
});

describe('import (merge)', () => {
  const incoming = {
    notes: [note('n1', { title: 'One' }), note('a', { title: 'Updated A' })],
    columns: [
      { id: 'col-todo', name: 'To do', collapsed: false, noteIds: ['n1'] },
      { id: 'col-new', name: 'Later', collapsed: false, noteIds: ['a'] },
    ],
  };

  it('adds new notes, updates matching ids, creates missing columns and places notes', () => {
    const s = reducer(seeded(), { type: 'import', data: incoming });
    expect(s.notes.map((n) => n.id)).toEqual(['c', 'b', 'a', 'n1']);
    expect(s.notes.find((n) => n.id === 'a').title).toBe('Updated A');
    expect(s.columns.map((c) => c.name)).toEqual(['To do', 'In progress', 'Done', 'Later']);
    expect(columnOf(s, 'n1').id).toBe('col-todo');
    expect(columnOf(s, 'a').id).toBe('col-new');
  });

  it('reproduces the exact order when importing into an empty board', () => {
    const s = reducer(createInitialState(), {
      type: 'import',
      data: { notes: [note('x'), note('y'), note('z')], columns: [{ id: 'col-todo', name: 'To do', collapsed: false, noteIds: ['z', 'x'] }] },
    });
    expect(s.notes.map((n) => n.id)).toEqual(['x', 'y', 'z']);
    expect(s.columns[0].noteIds).toEqual(['z', 'x']);
  });
});

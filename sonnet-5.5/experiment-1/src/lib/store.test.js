import { describe, expect, it } from 'vitest';
import {
  addColumn, addNote, clearColumn, daysUntil, duplicateNote, emptyState, exportData, isOverdue, matchesFilters,
  mergeImport, moveNote, notesInColumn, parseImport, removeColumn, removeNote, shiftNote, updateNote, validateNoteInput,
} from './store.js';

const input = (over = {}) => ({ title: 'Task', description: '', tags: [], priority: 'medium', dueDate: '', ...over });
const names = (state, col) => notesInColumn(state, col).map((n) => n.title);

function withNotes(...titles) {
  let state = emptyState();
  for (const title of titles) state = addNote(state, input({ title })).state;
  return state;
}

function placeAll(state, columnId) {
  let s = state;
  for (const n of state.notes) s = moveNote(s, n.id, columnId);
  return s;
}

describe('creating notes', () => {
  it('rejects a missing or blank title', () => {
    expect(validateNoteInput(input({ title: '' })).title).toBeTruthy();
    expect(validateNoteInput(input({ title: '   ' })).title).toBeTruthy();
    expect(validateNoteInput(input({ title: 'ok' }))).toEqual({});
  });

  it('keeps the title, description and tags', () => {
    const { note } = addNote(emptyState(), input({ title: ' Buy milk ', description: 'Two litres', tags: ['home', '#errand', 'Home'] }));
    expect(note.title).toBe('Buy milk');
    expect(note.description).toBe('Two litres');
    expect(note.tags).toEqual(['home', 'errand']); // trimmed, # removed, case-insensitive duplicates dropped
  });
});

describe('editing and deleting', () => {
  it('updates fields', () => {
    const { state, note } = addNote(emptyState(), input({ title: 'A' }));
    const next = updateNote(state, note.id, input({ title: 'B', tags: ['x'], priority: 'high' }));
    expect(next.notes[0]).toMatchObject({ title: 'B', tags: ['x'], priority: 'high' });
  });

  it('removes a note and closes the gap in its column', () => {
    let s = placeAll(withNotes('a', 'b', 'c'), 'col-todo');
    s = removeNote(s, s.notes[0].id);
    expect(notesInColumn(s, 'col-todo').map((n) => n.order)).toEqual([0, 1]);
  });

  it('duplicates directly under the original', () => {
    let s = placeAll(withNotes('a', 'b'), 'col-todo');
    s = duplicateNote(s, s.notes[0].id).state;
    expect(names(s, 'col-todo')).toEqual(['a', 'a (copy)', 'b']);
  });
});

describe('moving notes between columns', () => {
  it('assigns, moves and unassigns', () => {
    let s = withNotes('a');
    const id = s.notes[0].id;
    s = moveNote(s, id, 'col-todo');
    expect(names(s, 'col-todo')).toEqual(['a']);
    s = moveNote(s, id, 'col-doing');
    expect(names(s, 'col-todo')).toEqual([]);
    expect(names(s, 'col-doing')).toEqual(['a']);
    s = moveNote(s, id, null);
    expect(s.notes[0].columnId).toBeNull();
  });

  it('ignores an unknown column (a drop outside any column)', () => {
    const s = placeAll(withNotes('a'), 'col-todo');
    expect(moveNote(s, s.notes[0].id, 'does-not-exist')).toBe(s);
  });

  it('reorders within a column', () => {
    let s = placeAll(withNotes('a', 'b', 'c'), 'col-todo');
    const [a, , c] = s.notes;
    s = moveNote(s, c.id, 'col-todo', a.id);
    expect(names(s, 'col-todo')).toEqual(['c', 'a', 'b']);
    s = moveNote(s, c.id, 'col-todo', null);
    expect(names(s, 'col-todo')).toEqual(['a', 'b', 'c']);
    s = shiftNote(s, a.id, 1);
    expect(names(s, 'col-todo')).toEqual(['b', 'a', 'c']);
    s = shiftNote(s, a.id, -1);
    expect(names(s, 'col-todo')).toEqual(['a', 'b', 'c']);
    expect(shiftNote(s, a.id, -1)).toBe(s);
  });

  it('inserts at a position when moving between columns', () => {
    let s = withNotes('a', 'b', 'x');
    const [a, b, x] = s.notes;
    s = moveNote(moveNote(s, a.id, 'col-todo'), b.id, 'col-todo');
    s = moveNote(s, x.id, 'col-todo', b.id);
    expect(names(s, 'col-todo')).toEqual(['a', 'x', 'b']);
  });
});

describe('columns', () => {
  it('adds a column', () => {
    const { state, column } = addColumn(emptyState(), '  Review ');
    expect(state.columns.at(-1)).toMatchObject({ id: column.id, name: 'Review' });
  });

  it('deleting a column keeps its notes, unassigned', () => {
    let s = withNotes('a');
    s = moveNote(s, s.notes[0].id, 'col-doing');
    s = removeColumn(s, 'col-doing');
    expect(s.columns.some((c) => c.id === 'col-doing')).toBe(false);
    expect(s.notes[0].columnId).toBeNull();
  });

  it('clears a column without deleting it', () => {
    let s = placeAll(withNotes('a', 'b'), 'col-todo');
    s = clearColumn(s, 'col-todo');
    expect(s.notes).toHaveLength(2);
    expect(names(s, 'col-todo')).toEqual([]);
  });
});

describe('due dates and filters', () => {
  it('counts days', () => {
    expect(daysUntil('2026-03-10', '2026-03-09')).toBe(1);
    expect(daysUntil('2026-03-08', '2026-03-09')).toBe(-1);
    expect(daysUntil('2026-03-09', '2026-03-09')).toBe(0);
  });

  it('flags overdue notes, except in a done column', () => {
    let s = addNote(emptyState(), input({ title: 'late', dueDate: '2026-01-01' })).state;
    const id = s.notes[0].id;
    expect(isOverdue(s, s.notes[0], '2026-02-01')).toBe(true);
    expect(isOverdue(s, s.notes[0], '2025-12-31')).toBe(false);
    s = moveNote(s, id, 'col-done');
    expect(isOverdue(s, s.notes[0], '2026-02-01')).toBe(false);
  });

  it('searches title, description and tags, and combines filters', () => {
    const s = addNote(emptyState(), input({ title: 'Plan trip', description: 'Book flights', tags: ['Travel'], priority: 'high' })).state;
    const n = s.notes[0];
    const f = (o) => matchesFilters(s, n, { q: '', priority: 'all', tag: 'all', overdue: false, ...o });
    expect(f({ q: 'trip' })).toBe(true);
    expect(f({ q: 'FLIGHTS' })).toBe(true);
    expect(f({ q: 'travel' })).toBe(true);
    expect(f({ q: 'nothing' })).toBe(false);
    expect(f({ priority: 'low' })).toBe(false);
    expect(f({ priority: 'high', tag: 'travel' })).toBe(true);
    expect(f({ overdue: true })).toBe(false);
  });
});

describe('export and import', () => {
  const sample = () => {
    let s = addNote(emptyState(), input({ title: 'One', description: 'd', tags: ['a', 'b'], priority: 'high', dueDate: '2030-01-02' })).state;
    s = addNote(s, input({ title: 'Two' })).state;
    return moveNote(s, s.notes[0].id, 'col-doing');
  };

  it('round-trips an export through a fresh app without losing data', () => {
    const original = sample();
    const parsed = parseImport(JSON.stringify(exportData(original)));
    expect(parsed.ok).toBe(true);
    const { state, added } = mergeImport(emptyState(), parsed.data);
    expect(added).toBe(2);
    for (const n of original.notes) expect(state.notes).toContainEqual(n);
    expect(names(state, 'col-doing')).toEqual(['One']);
  });

  it('importing the same file twice does not duplicate notes', () => {
    const original = sample();
    const parsed = parseImport(JSON.stringify(exportData(original)));
    const once = mergeImport(original, parsed.data);
    expect(once.state.notes).toHaveLength(2);
    expect(once.updated).toBe(2);
  });

  it('keeps custom columns from the file', () => {
    let s = addColumn(emptyState(), 'Review').state;
    const colId = s.columns.at(-1).id;
    s = addNote(s, input({ title: 'x', columnId: colId })).state;
    const parsed = parseImport(JSON.stringify(exportData(s)));
    const { state } = mergeImport(emptyState(), parsed.data);
    expect(state.columns.map((c) => c.name)).toContain('Review');
    expect(state.notes[0].columnId).toBe(colId);
  });

  it.each([
    ['not json', '{oops'],
    ['wrong shape', '{"hello": "world"}'],
    ['a number', '42'],
    ['note without title', '{"notes":[{"description":"x"}]}'],
    ['bad tags', '{"notes":[{"title":"x","tags":"a,b"}]}'],
    ['bad priority', '{"notes":[{"title":"x","priority":"urgent"}]}'],
    ['bad date', '{"notes":[{"title":"x","dueDate":"tomorrow"}]}'],
    ['bad columns', '{"notes":[],"columns":[{"id":1}]}'],
  ])('rejects %s', (_label, text) => {
    const r = parseImport(text);
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('accepts a bare array of notes', () => {
    const r = parseImport('[{"title":"Plain"}]');
    expect(r.ok).toBe(true);
    expect(r.data.notes[0]).toMatchObject({ title: 'Plain', priority: 'medium', tags: [] });
  });
});

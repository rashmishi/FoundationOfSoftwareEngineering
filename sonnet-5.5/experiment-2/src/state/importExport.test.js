import { describe, expect, it } from 'vitest';
import { buildExport, normalizeData, parseImport } from './importExport.js';
import { createInitialState, reducer } from './reducer.js';

const full = (id, extra = {}) => ({
  id,
  title: `Note ${id}`,
  description: 'desc',
  tags: ['a', 'b'],
  priority: 'high',
  dueDate: '2026-12-31',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...extra,
});

describe('export and import round trip', () => {
  it('keeps every note field, column and ordering', () => {
    let s = createInitialState();
    s = reducer(s, { type: 'note/add', note: full('one'), columnId: 'col-doing' });
    s = reducer(s, { type: 'note/add', note: full('two', { tags: ['x'] }), columnId: 'col-doing' });
    s = reducer(s, { type: 'note/add', note: full('three', { priority: 'low' }), columnId: null });

    const text = JSON.stringify(buildExport(s));
    const parsed = parseImport(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.notes).toEqual(s.notes);

    const loaded = reducer(createInitialState(), { type: 'import', data: parsed.data });
    expect(loaded.notes).toEqual(s.notes);
    expect(loaded.columns.map((c) => c.noteIds)).toEqual(s.columns.map((c) => c.noteIds));
  });

  it('is valid JSON with all notes', () => {
    const s = reducer(createInitialState(), { type: 'note/add', note: full('one'), columnId: null });
    const doc = JSON.parse(JSON.stringify(buildExport(s)));
    expect(doc.notes).toHaveLength(1);
    expect(doc.app).toBe('notes-board');
  });
});

describe('rejecting bad files', () => {
  it('rejects text that is not JSON', () => {
    const r = parseImport('{ not json');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not valid JSON/);
  });

  it('rejects JSON that is not a list of notes', () => {
    expect(parseImport('{"hello":1}').ok).toBe(false);
    expect(parseImport('42').ok).toBe(false);
    expect(parseImport('"text"').ok).toBe(false);
  });

  it('rejects an empty list', () => {
    expect(parseImport('{"notes":[]}').ok).toBe(false);
  });

  it('rejects the whole file when any note is invalid, and says which one', () => {
    const r = parseImport(JSON.stringify({ notes: [{ title: 'ok' }, { title: '   ' }, 5] }));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Note 2 has no title');
    expect(r.error).toContain('Note 3 is not a note');
    expect(r.error).toContain('Nothing was imported');
  });

  it('rejects bad priorities, dates and tags', () => {
    expect(parseImport(JSON.stringify({ notes: [{ title: 'a', priority: 'urgent' }] })).ok).toBe(false);
    expect(parseImport(JSON.stringify({ notes: [{ title: 'a', dueDate: '2026-02-30' }] })).ok).toBe(false);
    expect(parseImport(JSON.stringify({ notes: [{ title: 'a', tags: [1] }] })).ok).toBe(false);
  });
});

describe('accepting simple files', () => {
  it('accepts a bare array of notes with only some fields', () => {
    const r = parseImport(JSON.stringify([{ title: 'Just a title' }, { title: 'With tags', tags: ['x', 'X', ' y '] }]));
    expect(r.ok).toBe(true);
    expect(r.data.notes[0]).toMatchObject({ title: 'Just a title', description: '', tags: [], priority: 'none', dueDate: '' });
    expect(r.data.notes[1].tags).toEqual(['x', 'y']);
    expect(r.data.notes[0].id).not.toEqual(r.data.notes[1].id);
  });

  it('gives duplicate or missing ids fresh ids', () => {
    const r = parseImport(JSON.stringify({ notes: [{ id: 'same', title: 'a' }, { id: 'same', title: 'b' }] }));
    expect(r.ok).toBe(true);
    expect(new Set(r.data.notes.map((n) => n.id)).size).toBe(2);
  });

  it('places notes using columnId when columns lists no noteIds', () => {
    const r = parseImport(JSON.stringify({ columns: [{ id: 'c1', name: 'Mine' }], notes: [{ title: 'a', columnId: 'c1' }, { title: 'b', columnId: 'missing' }] }));
    expect(r.ok).toBe(true);
    expect(r.data.columns[0].noteIds).toHaveLength(1);
  });
});

describe('loading saved data (lenient)', () => {
  it('repairs instead of rejecting', () => {
    const r = normalizeData({ notes: [{ title: 'ok', priority: 'weird' }, { title: '' }], columns: [{ name: 'Col' }] }, { strict: false });
    expect(r.ok).toBe(true);
    expect(r.data.notes).toHaveLength(1);
    expect(r.data.notes[0].priority).toBe('none');
    expect(r.data.columns[0].name).toBe('Col');
  });
});

import { describe, expect, it } from 'vitest';
import { exportFileName, parseImport, serialize } from '../model/importExport';
import {
  addColumn,
  addNote,
  defaultState,
  moveNote,
  notesInColumn,
  reducer,
  resolveDrop,
  updateNote,
} from '../model/reducer';
import { loadState, LOAD_ERROR, saveState, STORAGE_KEY } from '../model/storage';
import { parseTags } from '../model/tags';
import type { AppState } from '../model/types';

const withNote = (title = 'Buy milk'): AppState => reducer(defaultState(), addNote({ title, description: 'd', tags: 'a, b' }));

describe('parseTags', () => {
  it('trims, drops empties and case-insensitive duplicates', () => {
    expect(parseTags(' work, urgent,, Work ,  ')).toEqual(['work', 'urgent']);
    expect(parseTags('')).toEqual([]);
  });
});

describe('reducer', () => {
  it('starts with the three default columns', () => {
    expect(defaultState().columns.map((c) => c.name)).toEqual(['To do', 'In progress', 'Done']);
  });

  it('adds a note with all values and ignores an empty title', () => {
    const s = withNote();
    expect(s.notes).toHaveLength(1);
    expect(s.notes[0]).toMatchObject({ title: 'Buy milk', description: 'd', tags: ['a', 'b'], columnId: null });
    expect(reducer(s, addNote({ title: '   ', description: '', tags: '' })).notes).toHaveLength(1);
  });

  it('updates and deletes notes', () => {
    const s = withNote();
    const id = s.notes[0].id;
    const updated = reducer(s, updateNote(id, { title: 'New', description: 'x', tags: 'c' }));
    expect(updated.notes[0]).toMatchObject({ title: 'New', description: 'x', tags: ['c'] });
    expect(reducer(updated, { type: 'DELETE_NOTE', id }).notes).toHaveLength(0);
  });

  it('keeps a note in exactly one column when moved between columns', () => {
    let s = withNote();
    const id = s.notes[0].id;
    const [todo, doing] = s.columns;
    s = reducer(s, moveNote(id, todo.id));
    expect(notesInColumn(s, todo.id)).toHaveLength(1);
    s = reducer(s, moveNote(id, doing.id));
    expect(notesInColumn(s, todo.id)).toHaveLength(0);
    expect(notesInColumn(s, doing.id)).toHaveLength(1);
  });

  it('ignores moves to unknown columns', () => {
    const s = withNote();
    expect(reducer(s, moveNote(s.notes[0].id, 'nope'))).toBe(s);
  });

  it('rejects duplicate column names case-insensitively', () => {
    const s = reducer(defaultState(), addColumn('Review'));
    expect(s.columns).toHaveLength(4);
    expect(reducer(s, addColumn('review')).columns).toHaveLength(4);
  });
});

describe('resolveDrop', () => {
  it('distinguishes same column, other column and outside', () => {
    let s = withNote();
    const id = s.notes[0].id;
    s = reducer(s, moveNote(id, s.columns[0].id));
    expect(resolveDrop(s, id, s.columns[0].id)).toEqual({ kind: 'same', columnName: 'To do' });
    expect(resolveDrop(s, id, s.columns[1].id)).toEqual({ kind: 'moved', columnName: 'In progress' });
    expect(resolveDrop(s, id, null)).toEqual({ kind: 'none' });
  });
});

describe('import / export', () => {
  it('round-trips all data', () => {
    let s = withNote();
    s = reducer(s, moveNote(s.notes[0].id, s.columns[2].id));
    const json = serialize(s);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    const result = parseImport(json, []);
    expect(result).toEqual({ ok: true, state: s });
  });

  it('names the file with the date', () => {
    expect(exportFileName(new Date(2026, 9, 31))).toBe('notes-export-2026-10-31.json');
  });

  it.each([
    ['{not json', 'Import failed: the file is not valid JSON.'],
    ['[]', 'Import failed: the file does not contain a notes list.'],
    ['{"notes": {}}', 'Import failed: the file does not contain a notes list.'],
    ['{"version": 2, "notes": []}', 'Import failed: unsupported file version.'],
    ['{"notes": [{"title": ""}]}', 'Import failed: note 1 has no title.'],
    ['{"notes": [{"title": "a", "tags": [1]}]}', 'Import failed: note 1 has an invalid tags.'],
    ['{"notes": [{"id": "x", "title": "a"}, {"id": "x", "title": "b"}]}', 'Import failed: the file contains duplicate notes.'],
    ['{"notes": [], "columns": [{"id": 1}]}', 'Import failed: the board columns are invalid.'],
  ])('rejects %s', (text, error) => {
    expect(parseImport(text, [])).toEqual({ ok: false, error });
  });

  it('normalises missing fields and unknown columns', () => {
    const result = parseImport('{"notes": [{"title": " T ", "columnId": "ghost"}]}', defaultState().columns);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.notes[0]).toMatchObject({ title: 'T', description: '', tags: [], columnId: null });
      expect(result.state.columns).toHaveLength(3);
    }
  });
});

describe('storage', () => {
  it('saves and loads state', () => {
    const s = withNote();
    expect(saveState(s)).toBe(true);
    expect(loadState()).toEqual({ state: s });
  });

  it('reports corrupted data and starts empty', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    const loaded = loadState();
    expect(loaded.error).toBe(LOAD_ERROR);
    expect(loaded.state.notes).toEqual([]);
  });
});

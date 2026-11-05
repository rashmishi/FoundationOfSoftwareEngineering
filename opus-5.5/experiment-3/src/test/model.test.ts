import { describe, expect, it } from 'vitest';
import { dueStatus, formatLongDate, isValidISODate } from '../model/dates';
import { parseImport, serialise } from '../model/importExport';
import { boardReducer, emptyBoard } from '../model/reducer';
import { noteMatches, NO_FILTERS } from '../model/selectors';
import { parseTags, tagColour } from '../model/tags';
import { addToast, removeToast, type Toast } from '../model/toastQueue';
import type { BoardState, Note } from '../model/types';
import { columnNameError, validateNoteFields } from '../model/validation';

const note = (id: string, extra: Partial<Note> = {}): Note => ({
  id, title: `Note ${id}`, description: '', tags: [], priority: 'none', dueDate: null,
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z', ...extra,
});

function board(): BoardState {
  return {
    notes: [note('a'), note('b'), note('c')],
    columns: [
      { id: 'todo', name: 'To do', collapsed: false, noteIds: ['a', 'b'] },
      { id: 'done', name: 'Done', collapsed: false, noteIds: [] },
    ],
  };
}

describe('reducer', () => {
  it('moves a note between columns and removes it from the old one', () => {
    const s = boardReducer(board(), { type: 'moveNote', id: 'a', toColumnId: 'done', toIndex: 0 });
    expect(s.columns[0].noteIds).toEqual(['b']);
    expect(s.columns[1].noteIds).toEqual(['a']);
  });

  it('reorders within a column with positions counted without the note', () => {
    const s = boardReducer(board(), { type: 'moveNote', id: 'a', toColumnId: 'todo', toIndex: 1 });
    expect(s.columns[0].noteIds).toEqual(['b', 'a']);
  });

  it('removes a note from the board when the target is null', () => {
    const s = boardReducer(board(), { type: 'moveNote', id: 'b', toColumnId: null, toIndex: 0 });
    expect(s.columns[0].noteIds).toEqual(['a']);
    expect(s.notes).toHaveLength(3);
  });

  it('deletes a note from the list and its column', () => {
    const s = boardReducer(board(), { type: 'deleteNote', id: 'a' });
    expect(s.notes.map((n) => n.id)).toEqual(['b', 'c']);
    expect(s.columns[0].noteIds).toEqual(['b']);
  });

  it('deleting a column keeps its notes', () => {
    const s = boardReducer(board(), { type: 'deleteColumn', id: 'todo' });
    expect(s.columns.map((c) => c.id)).toEqual(['done']);
    expect(s.notes).toHaveLength(3);
  });

  it('moves columns and ignores moves past the ends', () => {
    expect(boardReducer(board(), { type: 'moveColumn', id: 'todo', delta: 1 }).columns.map((c) => c.id)).toEqual(['done', 'todo']);
    expect(boardReducer(board(), { type: 'moveColumn', id: 'todo', delta: -1 }).columns.map((c) => c.id)).toEqual(['todo', 'done']);
  });

  it('starts with three default columns', () => {
    expect(emptyBoard().columns.map((c) => c.name)).toEqual(['To do', 'In progress', 'Done']);
  });
});

describe('tags', () => {
  it('splits, trims and removes duplicates ignoring case', () => {
    expect(parseTags(' work, Home ,, work ,HOME, a  b ')).toEqual(['work', 'Home', 'a b']);
  });
  it('gives the same tag the same colour', () => {
    expect(tagColour('Work')).toBe(tagColour('work'));
  });
});

describe('dates', () => {
  it('validates real calendar dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('03/11/2026')).toBe(false);
  });
  it('formats with full weekday and month names', () => {
    expect(formatLongDate('2026-11-03')).toBe('Tuesday 3 November 2026');
  });
  it('marks past dates overdue except in Done', () => {
    expect(dueStatus('2026-11-01', 'To do', '2026-11-02')).toBe('overdue');
    expect(dueStatus('2026-11-01', 'done', '2026-11-02')).toBe('upcoming');
    expect(dueStatus('2026-11-02', undefined, '2026-11-02')).toBe('today');
  });
});

describe('validation', () => {
  it('requires a title and reports limits with the count', () => {
    expect(validateNoteFields({ title: '  ', description: '', tagsText: '', dueDate: '' }).title).toBe('Enter a title for the note.');
    expect(validateNoteFields({ title: 'x'.repeat(230), description: '', tagsText: '', dueDate: '' }).title).toBe(
      'Title can be at most 200 characters (you have 230).',
    );
  });
  it('rejects long tags and invalid dates, including bad typed input', () => {
    const e = validateNoteFields({ title: 'ok', description: '', tagsText: 'y'.repeat(41), dueDate: '', dueBadInput: true });
    expect(e.tags).toMatch(/longer than 40 characters/);
    expect(e.dueDate).toBe('Enter a valid date, for example 2026-11-03.');
  });
  it('rejects duplicate column names ignoring case', () => {
    expect(columnNameError('to DO', [{ id: '1', name: 'To do' }])).toBe('A column named "To do" already exists. Choose a different name.');
    expect(columnNameError('To do', [{ id: '1', name: 'To do' }], '1')).toBeUndefined();
  });
});

describe('import / export', () => {
  it('round-trips an export without losing data', () => {
    const state = board();
    state.notes[0] = note('a', { description: 'd', tags: ['x', 'y'], priority: 'high', dueDate: '2026-12-01' });
    const result = parseImport(JSON.stringify(serialise(state)));
    expect(result).toEqual({ ok: true, state });
  });

  it.each([
    ['not json {', 'The file is not valid JSON. Choose a file exported from this application.'],
    ['[]', 'The file does not contain notes data.'],
    [JSON.stringify({ format: 'other', version: 1, notes: [], columns: [] }), 'The file is not a notes export.'],
    [JSON.stringify({ format: 'notes-kanban', version: 2, notes: [], columns: [] }), 'newer version (version 2)'],
    [JSON.stringify({ format: 'notes-kanban', version: 1, notes: [{ id: 'a' }], columns: [] }), 'Note 1 has no title.'],
    [JSON.stringify({ format: 'notes-kanban', version: 1, notes: [{ id: 'a', title: 't', dueDate: '2026-13-01' }], columns: [] }), 'invalid due date'],
    [JSON.stringify({ format: 'notes-kanban', version: 1, notes: [], columns: [{ id: 'c', name: 'Done', noteIds: ['zz'] }] }), 'refers to a note that is not in the file'],
  ])('rejects invalid file %#', (text, message) => {
    const result = parseImport(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });
});

describe('filters', () => {
  it('matches title, description and tags ignoring case', () => {
    const n = note('a', { title: 'Buy milk', description: 'semi skimmed', tags: ['Groceries'] });
    expect(noteMatches(n, { ...NO_FILTERS, query: 'MILK' }, undefined, '2026-11-02')).toBe(true);
    expect(noteMatches(n, { ...NO_FILTERS, query: 'skim' }, undefined, '2026-11-02')).toBe(true);
    expect(noteMatches(n, { ...NO_FILTERS, query: 'groc' }, undefined, '2026-11-02')).toBe(true);
    expect(noteMatches(n, { ...NO_FILTERS, query: 'bread' }, undefined, '2026-11-02')).toBe(false);
  });
});

describe('toast queue', () => {
  const t = (id: string, kind: Toast['kind'] = 'success', undoId?: string) => ({ id, text: id, kind, undoId });

  it('shows up to the limit and evicts the oldest unprotected toast', () => {
    let list: Toast[] = [];
    for (const id of ['1', '2', '3', '4']) list = addToast(list, t(id), 3, null);
    expect(list.filter((x) => x.visible).map((x) => x.id)).toEqual(['2', '3', '4']);
  });

  it('never evicts error toasts or the focused toast; new ones wait in the queue', () => {
    let list: Toast[] = addToast([], t('err', 'error'), 1, null);
    list = addToast(list, t('ok'), 1, null);
    expect(list.map((x) => [x.id, x.visible])).toEqual([['err', true], ['ok', false]]);
    list = removeToast(list, 'err', 1, null);
    expect(list.map((x) => [x.id, x.visible])).toEqual([['ok', true]]);

    let focused: Toast[] = addToast([], t('f'), 1, null);
    focused = addToast(focused, t('g'), 1, 'f');
    expect(focused.map((x) => [x.id, x.visible])).toEqual([['f', true], ['g', false]]);
  });

  it('replaces an older Undo toast with the newer one', () => {
    let list = addToast([], t('a', 'success', 'u1'), 3, null);
    list = addToast(list, t('b', 'success', 'u2'), 3, null);
    expect(list.map((x) => x.id)).toEqual(['b']);
  });
});

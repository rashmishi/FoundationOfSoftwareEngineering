import { describe, expect, it } from 'vitest';
import { addNote, defaultData, moveNote } from './notes';
import { countReplacedNotes, InvalidDataError, mergeImport, parseImport, serializeExport, validateBoardData } from './transfer';
import type { BoardData } from './types';

function sampleData(): BoardData {
  const data = addNote(defaultData(), { title: 'Title', description: 'Text\nmore', tags: ['a', 'b'] });
  return moveNote(data, data.notes[0].id, 'done');
}

describe('export and import', () => {
  it('round-trips all data', () => {
    const data = sampleData();
    expect(parseImport(serializeExport(data))).toEqual(data);
  });

  it('round-trips an empty board', () => {
    expect(parseImport(serializeExport(defaultData()))).toEqual(defaultData());
  });

  it('ignores unknown fields', () => {
    const data = sampleData();
    const notes = data.notes.map((note) => ({ ...note, extra: true }));
    expect(parseImport(JSON.stringify({ ...data, notes, version: 1, extra: true }))).toEqual(data);
  });
});

describe('invalid imports', () => {
  const validNote = sampleData().notes[0];
  const withNote = (changes: object) => JSON.stringify({ ...sampleData(), version: 1, notes: [{ ...validNote, ...changes }] });

  it.each([
    ['broken JSON', '{', 'not valid JSON'],
    ['a JSON array', '[]', 'not a Notes Board export'],
    ['a JSON null', 'null', 'not a Notes Board export'],
    ['the wrong version', '{"version":2,"notes":[],"columns":[]}', 'not a Notes Board export'],
    ['missing notes', '{"version":1,"columns":[]}', 'notes list'],
    ['a note that is not an object', '{"version":1,"columns":[],"notes":[1]}', 'Note 1 is not a note'],
    ['a blank title', withNote({ title: '  ' }), 'has no title'],
    ['a missing id', withNote({ id: undefined }), 'has no id'],
    ['non-text tags', withNote({ tags: [1] }), 'tags of note 1'],
    ['a missing description', withNote({ description: undefined }), 'no description'],
    ['an unknown column', withNote({ columnId: 'nowhere' }), 'column that is not in the file'],
    ['missing times', withNote({ updatedAt: undefined }), 'created and updated times'],
  ])('rejects %s', (_name, text, message) => {
    expect(() => parseImport(text)).toThrow(InvalidDataError);
    expect(() => parseImport(text)).toThrow(message);
  });

  it('rejects duplicate note ids', () => {
    const notes = [validNote, validNote];
    expect(() => validateBoardData({ ...sampleData(), notes })).toThrow('share the same id');
  });
});

describe('countReplacedNotes', () => {
  it('does not count notes that only came through an export and import', () => {
    const data = sampleData();
    expect(countReplacedNotes(data, parseImport(serializeExport(data)))).toBe(0);
  });

  it('counts notes whose visible content differs', () => {
    const data = sampleData();
    const notes = data.notes.map((note) => ({ ...note, title: 'Changed' }));
    expect(countReplacedNotes(data, { ...data, notes })).toBe(1);
  });

  it('does not count notes that are new', () => {
    const data = sampleData();
    const notes = data.notes.map((note) => ({ ...note, id: 'new', title: 'Changed' }));
    expect(countReplacedNotes(data, { ...data, notes })).toBe(0);
  });
});

describe('mergeImport', () => {
  it('keeps existing notes, adds new ones and replaces matching ids', () => {
    const existing = sampleData();
    const changed = { ...existing.notes[0], title: 'From file' };
    const added = { ...existing.notes[0], id: 'other' };
    const local = { ...existing.notes[0], id: 'local' };

    const merged = mergeImport(
      { ...existing, notes: [existing.notes[0], local] },
      { columns: existing.columns, notes: [changed, added] },
    );

    expect(merged.notes.map((note) => note.title)).toEqual(['From file', 'Title', 'Title']);
    expect(merged.notes.map((note) => note.id)).toEqual([existing.notes[0].id, 'local', 'other']);
    expect(merged.columns).toEqual(existing.columns);
  });

  it('adds columns from the file', () => {
    const column = { id: 'review', name: 'Review' };
    const merged = mergeImport(defaultData(), { notes: [], columns: [column] });
    expect(merged.columns.at(-1)).toEqual(column);
  });
});

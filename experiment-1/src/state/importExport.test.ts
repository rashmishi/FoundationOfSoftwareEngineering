import { buildExport, exportFileName, ImportError, parseImport } from './importExport';
import { createInitialState } from './notesReducer';
import type { AppState } from '../types';

const NOW = '2026-10-30T10:00:00.000Z';

const sample: AppState = {
  columns: createInitialState().columns,
  notes: [
    { id: 'n1', title: 'One', description: 'First', tags: ['a'], columnId: 'todo', createdAt: NOW, updatedAt: NOW },
    { id: 'n2', title: 'Two', description: '', tags: [], columnId: null, createdAt: NOW, updatedAt: NOW },
  ],
};

describe('export (FR-3.1)', () => {
  it('builds a versioned envelope with all notes and columns', () => {
    const file = buildExport(sample, new Date(NOW));
    expect(file).toEqual({ app: 'notes-kanban', version: 1, exportedAt: NOW, ...sample });
  });
  it('names the file by date', () => {
    expect(exportFileName(new Date(NOW))).toBe('notes-2026-10-30.json');
  });
});

describe('parseImport', () => {
  it('round-trips an exported file losslessly (FR-3.2)', () => {
    const text = JSON.stringify(buildExport(sample));
    expect(parseImport(text)).toEqual(sample);
  });

  it.each([
    ['not JSON', '{oops', /not valid JSON/],
    ['an array', '[]', /does not contain/],
    ['a foreign file', JSON.stringify({ hello: 'world' }), /not exported from Notes Kanban/],
    ['a newer version', JSON.stringify({ app: 'notes-kanban', version: 2, notes: [], columns: [] }), /Unsupported export version/],
    ['notes not an array', JSON.stringify({ app: 'notes-kanban', version: 1, notes: {}, columns: [] }), /“notes” must be an array/],
    [
      'a note without a title',
      JSON.stringify({ ...buildExport(sample), notes: [{ ...sample.notes[0], title: '' }] }),
      /notes\[0\]\.title must be a non-empty string/,
    ],
    [
      'tags that are not strings',
      JSON.stringify({ ...buildExport(sample), notes: [{ ...sample.notes[0], tags: [1] }] }),
      /notes\[0\]\.tags/,
    ],
    [
      'duplicate note ids',
      JSON.stringify({ ...buildExport(sample), notes: [sample.notes[0], sample.notes[0]] }),
      /duplicated/,
    ],
  ])('rejects %s (FR-3.3)', (_label, text, message) => {
    expect(() => parseImport(text)).toThrow(ImportError);
    expect(() => parseImport(text)).toThrow(message);
  });
});

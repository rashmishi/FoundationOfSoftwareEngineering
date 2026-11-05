import { describe, expect, it } from 'vitest';
import type { BoardState } from '../types';
import { createNote, defaultBoard } from './notes';
import { exportFileName, parseBoard, parseBoardFile, serialise, toExportFile } from './transfer';

function sample(): BoardState {
  const a = createNote({ title: 'A', description: 'desc', tags: ['x', 'y'], priority: 'high', dueDate: '2026-11-05' }, 'a', '2026-11-01T00:00:00.000Z');
  const b = createNote({ title: 'B', description: '', tags: [], priority: 'none', dueDate: null }, 'b', '2026-11-02T00:00:00.000Z');
  const state = defaultBoard();
  state.notes = [b, a];
  state.columns[1] = { ...state.columns[1], noteIds: ['a'], collapsed: true };
  return state;
}

describe('export', () => {
  it('writes a versioned file with every note and column', () => {
    const file = toExportFile(sample(), new Date('2026-11-02T10:00:00.000Z'));
    expect(file).toMatchObject({ format: 'notes-kanban', version: 1, exportedAt: '2026-11-02T10:00:00.000Z' });
    expect(file.notes).toHaveLength(2);
    expect(file.columns).toHaveLength(3);
  });

  it('names the file after the local date', () => {
    expect(exportFileName(new Date(2026, 0, 5))).toBe('notes-2026-01-05.json');
  });
});

describe('round trip', () => {
  it('imports an exported file with all data preserved', () => {
    const state = sample();
    const result = parseBoardFile(serialise(state));
    expect(result).toEqual({ ok: true, state });
  });
});

describe('import validation', () => {
  const reject = (text: string) => {
    const result = parseBoardFile(text);
    expect(result.ok).toBe(false);
    return result.ok ? '' : result.error;
  };

  it('rejects text that is not JSON', () => {
    expect(reject('{ not json')).toBe('The file is not valid JSON.');
  });

  it('rejects JSON that is not a notes file', () => {
    expect(reject('42')).toMatch(/JSON object/);
    expect(reject('{"hello": 1}')).toMatch(/"notes" array/);
    expect(reject('{"format": "other", "notes": []}')).toMatch(/Unknown file format/);
    expect(reject('{"version": 99, "notes": []}')).toMatch(/Unsupported file version/);
  });

  it('rejects notes with missing or bad fields, naming the place', () => {
    expect(reject('{"notes": [{"id": "a"}]}')).toBe('notes[0].title must be a non-empty string.');
    expect(reject('{"notes": [{"title": "x"}]}')).toBe('notes[0].id must be a non-empty string.');
    expect(reject('{"notes": [{"id": "a", "title": "x", "tags": "x"}]}')).toMatch(/tags must be an array/);
    expect(reject('{"notes": [{"id": "a", "title": "x", "priority": "urgent"}]}')).toMatch(/priority must be one of/);
    expect(reject('{"notes": [{"id": "a", "title": "x", "dueDate": "2026-02-30"}]}')).toMatch(/dueDate/);
  });

  it('rejects duplicate ids and broken column references', () => {
    expect(reject('{"notes": [{"id": "a", "title": "x"}, {"id": "a", "title": "y"}]}')).toMatch(/more than one note/);
    expect(reject('{"notes": [], "columns": [{"id": "c", "name": "C", "noteIds": ["zz"]}]}')).toMatch(/unknown note/);
    expect(
      reject('{"notes": [{"id": "a", "title": "x"}], "columns": [{"id": "c", "name": "C", "noteIds": ["a"]}, {"id": "d", "name": "D", "noteIds": ["a"]}]}'),
    ).toMatch(/more than one column/);
    expect(reject('{"notes": [], "columns": [{"id": "c", "name": "C"}, {"id": "c", "name": "D"}]}')).toMatch(/more than one column/);
  });

  it('fills in optional fields with defaults', () => {
    const result = parseBoard({ notes: [{ id: 'a', title: ' Hi ' }] }, [], '2026-11-02T00:00:00.000Z');
    expect(result).toEqual({
      ok: true,
      state: {
        notes: [
          {
            id: 'a',
            title: 'Hi',
            description: '',
            tags: [],
            priority: 'none',
            dueDate: null,
            createdAt: '2026-11-02T00:00:00.000Z',
            updatedAt: '2026-11-02T00:00:00.000Z',
          },
        ],
        columns: [],
      },
    });
  });

  it('accepts a bare array of notes and keeps the current columns, emptied', () => {
    const current = sample().columns;
    const result = parseBoard([{ id: 'a', title: 'x' }], current);
    expect(result.ok && result.state.columns.map((c) => [c.name, c.noteIds])).toEqual([
      ['To do', []],
      ['In progress', []],
      ['Done', []],
    ]);
  });
});

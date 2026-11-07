import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from './importExport.js';
import { isOverdue, isValidDate, parseTags } from './helpers.js';
import { createNote, defaultState, reducer } from '../state/reducer.js';

function sampleState() {
  let state = defaultState();
  const a = createNote({ title: 'Write report', description: 'Quarterly', tags: ['work', 'urgent'], priority: 'high', dueDate: '2030-01-02' });
  const b = createNote({ title: 'Buy milk', tags: ['home'] });
  state = reducer(state, { type: 'ADD_NOTE', note: a });
  state = reducer(state, { type: 'ADD_NOTE', note: b });
  state = reducer(state, { type: 'MOVE_NOTE', id: a.id, columnId: 'col_doing' });
  return state;
}

describe('export and import', () => {
  it('round-trips notes and column placement', () => {
    const original = sampleState();
    const text = exportJSON(original);
    expect(() => JSON.parse(text)).not.toThrow();
    const result = importJSON(text, defaultState());
    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
    expect(result.state.notes).toEqual(original.notes);
    expect(result.state.columns.find((c) => c.id === 'col_doing').noteIds).toEqual(original.columns[1].noteIds);
  });

  it('replaces notes with the same id instead of duplicating them', () => {
    const original = sampleState();
    const result = importJSON(exportJSON(original), original);
    expect(result.state.notes).toHaveLength(2);
  });

  it('creates columns that do not exist yet', () => {
    const file = JSON.stringify({ notes: [{ id: 'x', title: 'X' }], columns: [{ id: 'new', name: 'Review', noteIds: ['x'] }] });
    const result = importJSON(file, defaultState());
    expect(result.state.columns.at(-1)).toMatchObject({ name: 'Review', noteIds: ['x'] });
  });

  it('accepts a plain array of notes', () => {
    const result = importJSON('[{"title":"Only a title"}]', defaultState());
    expect(result.ok).toBe(true);
    expect(result.state.notes[0]).toMatchObject({ title: 'Only a title', priority: 'medium', tags: [] });
  });

  it.each([
    ['not json at all', 'not valid JSON'],
    ['{"hello":1}', 'list of notes'],
    ['[{"description":"no title"}]', 'no title'],
    ['[{"title":"x","tags":"a"}]', 'tags'],
    ['[{"title":"x","priority":"urgent"}]', 'priority'],
    ['[{"title":"x","dueDate":"tomorrow"}]', 'due date'],
    ['[42]', 'not an object'],
  ])('rejects %s', (text, message) => {
    const result = importJSON(text, defaultState());
    expect(result.ok).toBe(false);
    expect(result.error).toContain(message);
  });
});

describe('helpers', () => {
  it('parses tags', () => {
    expect(parseTags(' Work, home ,work,, ')).toEqual(['work', 'home']);
  });

  it('validates dates and overdue state', () => {
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('2023-02-29')).toBe(false);
    expect(isOverdue('2020-01-01', '2024-01-01')).toBe(true);
    expect(isOverdue('2024-01-01', '2024-01-01')).toBe(false);
    expect(isOverdue('', '2024-01-01')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { createNote, defaultBoard } from './notes';
import { loadBoard, saveBoard, STORAGE_KEY, type KeyValueStore } from './storage';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe('storage', () => {
  it('starts with the default board when nothing is stored', () => {
    expect(loadBoard(memoryStore())).toEqual({ state: defaultBoard() });
  });

  it('round-trips the board, as on a page refresh', () => {
    const store = memoryStore();
    const state = defaultBoard();
    state.notes = [createNote({ title: 'Keep me', description: 'd', tags: ['t'], priority: 'low', dueDate: null }, 'k')];
    state.columns[2].noteIds = ['k'];
    expect(saveBoard(state, store)).toBe(true);
    expect(loadBoard(store)).toEqual({ state });
  });

  it('resets damaged data, keeps a copy, and reports an error', () => {
    const store = memoryStore({ [STORAGE_KEY]: '{"notes": "oops"}' });
    const result = loadBoard(store);
    expect(result.state).toEqual(defaultBoard());
    expect(result.error).toMatch(/damaged/);
    expect(store.data[`${STORAGE_KEY}:corrupt`]).toBe('{"notes": "oops"}');
  });

  it('reports a refused write', () => {
    const store: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(saveBoard(defaultBoard(), store)).toBe(false);
  });
});

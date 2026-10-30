import { loadState, saveState, STORAGE_KEY } from './storage';
import { createInitialState } from './notesReducer';
import type { AppState } from '../types';

const state: AppState = {
  columns: [{ id: 'todo', name: 'To Do' }],
  notes: [
    {
      id: 'n1',
      title: 'Saved',
      description: 'd',
      tags: ['t'],
      columnId: 'todo',
      createdAt: '2026-10-30T10:00:00.000Z',
      updatedAt: '2026-10-30T10:00:00.000Z',
    },
  ],
};

describe('storage (NFR-1)', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadState()).toEqual(createInitialState());
  });

  it('round-trips saved state', () => {
    expect(saveState(state)).toBe(true);
    expect(loadState()).toEqual(state);
  });

  it('falls back to defaults for corrupt data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadState()).toEqual(createInitialState());
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, notes: 'x', columns: [] }));
    expect(loadState()).toEqual(createInitialState());
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('reports a failed write instead of throwing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = { setItem: () => { throw new Error('QuotaExceeded'); } } as unknown as Storage;
    expect(saveState(state, failing)).toBe(false);
  });
});

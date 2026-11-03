import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, isFiltering, matchesFilters, type Filters } from './filter';
import { createNote } from './notes';

const today = '2026-11-02';
const note = createNote({ title: 'Write report', description: 'Chapter on testing', tags: ['Uni', 'writing'], priority: 'high', dueDate: '2026-11-01' });
const f = (changes: Partial<Filters>): Filters => ({ ...EMPTY_FILTERS, ...changes });

describe('filters', () => {
  it('matches everything when empty', () => {
    expect(isFiltering(EMPTY_FILTERS)).toBe(false);
    expect(matchesFilters(note, EMPTY_FILTERS, today)).toBe(true);
  });

  it('searches title, description and tags; every word must match', () => {
    expect(matchesFilters(note, f({ query: 'REPORT' }), today)).toBe(true);
    expect(matchesFilters(note, f({ query: 'testing' }), today)).toBe(true);
    expect(matchesFilters(note, f({ query: 'uni report' }), today)).toBe(true);
    expect(matchesFilters(note, f({ query: 'uni groceries' }), today)).toBe(false);
  });

  it('filters by tag (ignoring case) and priority', () => {
    expect(matchesFilters(note, f({ tag: 'uni' }), today)).toBe(true);
    expect(matchesFilters(note, f({ tag: 'home' }), today)).toBe(false);
    expect(matchesFilters(note, f({ priority: 'high' }), today)).toBe(true);
    expect(matchesFilters(note, f({ priority: 'low' }), today)).toBe(false);
  });

  it('filters by due date', () => {
    expect(matchesFilters(note, f({ due: 'overdue' }), today)).toBe(true);
    expect(matchesFilters(note, f({ due: 'overdue' }), today, true)).toBe(false);
    expect(matchesFilters(note, f({ due: 'today' }), today)).toBe(false);
    expect(matchesFilters(note, f({ due: 'week' }), today)).toBe(false);
    expect(matchesFilters(note, f({ due: 'none' }), today)).toBe(false);
    expect(matchesFilters({ ...note, dueDate: '2026-11-08' }, f({ due: 'week' }), today)).toBe(true);
  });
});

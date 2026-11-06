import { describe, expect, it } from 'vitest';
import { addDays, dueStatus, isValidIsoDate, todayIso } from './dates';
import { countActiveFilters, DEFAULT_FILTERS, filterNotes, NOT_ON_BOARD, uniqueTags, type Filters } from './filters';
import type { Note } from './types';

const TODAY = '2026-11-04';

function note(title: string, changes: Partial<Note> = {}): Note {
  return {
    id: title,
    title,
    description: '',
    tags: [],
    priority: 'none',
    dueDate: null,
    columnId: null,
    createdAt: `2026-01-0${title.length}T00:00:00.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...changes,
  };
}

const notes = [
  note('a', { priority: 'high', dueDate: '2026-11-01', tags: ['Work'], columnId: 'todo' }),
  note('bb', { priority: 'low', dueDate: TODAY, tags: ['home'] }),
  note('ccc', { dueDate: '2026-11-10', tags: ['work', 'home'], description: 'Has words' }),
  note('dddd'),
];

function titles(search: string, changes: Partial<Filters> = {}) {
  return filterNotes(notes, search, { ...DEFAULT_FILTERS, ...changes }, TODAY).map((item) => item.title);
}

describe('filterNotes', () => {
  it('searches titles, descriptions and tags, ignoring case', () => {
    expect(titles('CCC')).toEqual(['ccc']);
    expect(titles('words')).toEqual(['ccc']);
    expect(titles('HOME')).toEqual(['bb', 'ccc']);
  });

  it.each<[Partial<Filters>, string[]]>([
    [{ priority: 'high' }, ['a']],
    [{ priority: 'none' }, ['ccc', 'dddd']],
    [{ tag: 'work' }, ['a', 'ccc']],
    [{ column: 'todo' }, ['a']],
    [{ column: NOT_ON_BOARD }, ['bb', 'ccc', 'dddd']],
    [{ due: 'overdue' }, ['a']],
    [{ due: 'today' }, ['bb']],
    [{ due: 'week' }, ['bb', 'ccc']],
    [{ due: 'none' }, ['dddd']],
    [{ priority: 'high', tag: 'home' }, []],
  ])('filters by %o', (changes, expected) => {
    expect(titles('', changes)).toEqual(expected);
  });

  it.each<[Filters['sort'], string[]]>([
    ['oldest', ['a', 'bb', 'ccc', 'dddd']],
    ['newest', ['dddd', 'ccc', 'bb', 'a']],
    ['due', ['a', 'bb', 'ccc', 'dddd']],
    ['priority', ['a', 'bb', 'ccc', 'dddd']],
    ['title', ['a', 'bb', 'ccc', 'dddd']],
  ])('sorts by %s', (sort, expected) => {
    expect(titles('', { sort })).toEqual(expected);
  });

  it('does not change the notes it was given', () => {
    const before = notes.map((item) => item.title);
    titles('', { sort: 'newest' });
    expect(notes.map((item) => item.title)).toEqual(before);
  });
});

describe('filter helpers', () => {
  it('counts active filters, but not the sort order', () => {
    expect(countActiveFilters({ ...DEFAULT_FILTERS, sort: 'title' })).toBe(0);
    expect(countActiveFilters({ ...DEFAULT_FILTERS, tag: 'work', due: 'today' })).toBe(2);
  });

  it('lists each tag once, ignoring case, in order', () => {
    expect(uniqueTags(notes)).toEqual(['home', 'Work']);
  });
});

describe('dates', () => {
  it('reports overdue, today and upcoming', () => {
    expect(dueStatus('2026-11-03', TODAY)).toBe('overdue');
    expect(dueStatus(TODAY, TODAY)).toBe('today');
    expect(dueStatus('2027-01-01', TODAY)).toBe('upcoming');
    expect(dueStatus(null, TODAY)).toBeNull();
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('accepts only real dates in YYYY-MM-DD form', () => {
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-1-5')).toBe(false);
  });

  it('uses the local date, not the UTC date', () => {
    expect(todayIso(new Date(2026, 10, 4, 23, 59))).toBe('2026-11-04');
  });
});

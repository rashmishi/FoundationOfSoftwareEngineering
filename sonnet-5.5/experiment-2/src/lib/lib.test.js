import { describe, expect, it } from 'vitest';
import { daysBetween, dueStatus, isValidISODate, todayISO } from './dates.js';
import { emptyFilters, isFiltering, matchesFilters } from './filter.js';
import { addTag, validateColumnName, validateNote } from './noteModel.js';

describe('dates', () => {
  it('formats local dates and validates real calendar dates', () => {
    expect(todayISO(new Date(2026, 10, 6))).toBe('2026-11-06');
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('11/06/2026')).toBe(false);
  });

  it('finds overdue, today and upcoming', () => {
    expect(dueStatus('2026-11-05', '2026-11-06')).toBe('overdue');
    expect(dueStatus('2026-11-06', '2026-11-06')).toBe('today');
    expect(dueStatus('2026-11-07', '2026-11-06')).toBe('upcoming');
    expect(dueStatus('', '2026-11-06')).toBeNull();
    expect(daysBetween('2026-11-06', '2026-11-13')).toBe(7);
  });
});

describe('note validation', () => {
  it('requires a title', () => {
    expect(validateNote({ title: '   ' }).title).toMatch(/Enter a title/);
    expect(validateNote({ title: 'ok' })).toEqual({});
  });

  it('limits lengths and checks the due date', () => {
    expect(validateNote({ title: 'x'.repeat(121) }).title).toMatch(/Shorten/);
    expect(validateNote({ title: 'a', description: 'x'.repeat(2001) }).description).toMatch(/Shorten/);
    expect(validateNote({ title: 'a', dueDate: '2026-13-01' }).dueDate).toMatch(/real date/);
  });

  it('validates column names, including duplicates', () => {
    const cols = [{ id: '1', name: 'To do' }];
    expect(validateColumnName('', cols)).toMatch(/Enter a column name/);
    expect(validateColumnName(' to DO ', cols)).toMatch(/already exists/);
    expect(validateColumnName('to do', cols, '1')).toBeNull();
    expect(validateColumnName('Review', cols)).toBeNull();
  });
});

describe('tags', () => {
  it('normalises, ignores duplicates case-insensitively and enforces limits', () => {
    let r = addTag([], '  #Work  ');
    expect(r.tags).toEqual(['Work']);
    r = addTag(r.tags, 'work');
    expect(r.added).toBe(false);
    expect(r.duplicate).toBe('work');
    expect(addTag([], 'x'.repeat(31)).error).toMatch(/at most 30/);
    const ten = Array.from({ length: 10 }, (_, i) => `t${i}`);
    expect(addTag(ten, 'extra').error).toMatch(/up to 10/);
  });
});

describe('filters', () => {
  const note = { title: 'Buy milk', description: 'Two litres', tags: ['Home'], priority: 'high', dueDate: '2026-11-01' };
  const today = '2026-11-06';

  it('is inactive when empty', () => {
    expect(isFiltering(emptyFilters)).toBe(false);
    expect(matchesFilters(note, null, emptyFilters, today)).toBe(true);
  });

  it('searches title, description and tags', () => {
    expect(matchesFilters(note, null, { ...emptyFilters, query: 'MILK' }, today)).toBe(true);
    expect(matchesFilters(note, null, { ...emptyFilters, query: 'litres' }, today)).toBe(true);
    expect(matchesFilters(note, null, { ...emptyFilters, query: 'home' }, today)).toBe(true);
    expect(matchesFilters(note, null, { ...emptyFilters, query: 'bread' }, today)).toBe(false);
  });

  it('filters by priority, tag, column and due date', () => {
    expect(matchesFilters(note, null, { ...emptyFilters, priority: 'low' }, today)).toBe(false);
    expect(matchesFilters(note, null, { ...emptyFilters, tag: 'home' }, today)).toBe(true);
    expect(matchesFilters(note, 'c1', { ...emptyFilters, column: 'none' }, today)).toBe(false);
    expect(matchesFilters(note, null, { ...emptyFilters, column: 'none' }, today)).toBe(true);
    expect(matchesFilters(note, 'c1', { ...emptyFilters, column: 'c1' }, today)).toBe(true);
    expect(matchesFilters(note, null, { ...emptyFilters, due: 'overdue' }, today)).toBe(true);
    expect(matchesFilters(note, null, { ...emptyFilters, due: 'week' }, today)).toBe(false);
  });
});

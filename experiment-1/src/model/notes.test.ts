import { describe, expect, it } from 'vitest';
import { allTags, createNote, defaultBoard, parseTags, validateColumnName, validateDraft } from './notes';

const draft = { title: 'Title', description: '', tags: [], priority: 'none' as const, dueDate: null };

describe('parseTags', () => {
  it('splits on commas, trims and drops empties', () => {
    expect(parseTags(' work,  urgent ,, ')).toEqual(['work', 'urgent']);
  });

  it('removes case-insensitive duplicates, keeping the first spelling', () => {
    expect(parseTags('Work, work, WORK, home')).toEqual(['Work', 'home']);
  });

  it('collapses inner whitespace', () => {
    expect(parseTags('big   project')).toEqual(['big project']);
  });
});

describe('validateDraft', () => {
  it('rejects a blank title', () => {
    expect(validateDraft({ ...draft, title: '' })).toBe('Title is required.');
    expect(validateDraft({ ...draft, title: '   ' })).toBe('Title is required.');
  });

  it('rejects an overly long title', () => {
    expect(validateDraft({ ...draft, title: 'x'.repeat(121) })).toMatch(/at most 120/);
  });

  it('accepts a title', () => {
    expect(validateDraft(draft)).toBeNull();
  });
});

describe('createNote', () => {
  it('keeps every entered value, trimmed', () => {
    const note = createNote(
      { title: '  Plan  ', description: ' Details ', tags: ['a', 'b'], priority: 'high', dueDate: '2026-11-05' },
      'id-1',
      '2026-11-02T00:00:00.000Z',
    );
    expect(note).toEqual({
      id: 'id-1',
      title: 'Plan',
      description: 'Details',
      tags: ['a', 'b'],
      priority: 'high',
      dueDate: '2026-11-05',
      createdAt: '2026-11-02T00:00:00.000Z',
      updatedAt: '2026-11-02T00:00:00.000Z',
    });
  });
});

describe('validateColumnName', () => {
  const columns = defaultBoard().columns;

  it('requires a name', () => {
    expect(validateColumnName('  ', columns)).toBe('Column name is required.');
  });

  it('rejects duplicate names ignoring case', () => {
    expect(validateColumnName('to DO', columns)).toMatch(/already exists/);
  });

  it('allows renaming a column to its own name', () => {
    expect(validateColumnName('To do', columns, 'todo')).toBeNull();
  });
});

describe('allTags', () => {
  it('lists unique tags alphabetically', () => {
    const notes = [createNote({ ...draft, tags: ['b', 'A'] }), createNote({ ...draft, tags: ['a', 'c'] })];
    expect(allTags(notes)).toEqual(['A', 'b', 'c']);
  });
});

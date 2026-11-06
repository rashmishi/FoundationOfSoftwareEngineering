import { describe, expect, it } from 'vitest';
import {
  addColumn,
  addNote,
  defaultData,
  deleteColumn,
  deleteNote,
  isColumnNameTaken,
  moveColumn,
  moveNote,
  newId,
  notesInColumn,
  parseTags,
  renameColumn,
  tagColour,
  updateNote,
} from './notes';
import type { NoteDraft } from './types';

const draft: NoteDraft = { title: 'Title', description: 'Description', tags: ['tag'], priority: 'none', dueDate: null };

describe('parseTags', () => {
  it('splits on commas and trims', () => {
    expect(parseTags(' work, home ,urgent')).toEqual(['work', 'home', 'urgent']);
  });

  it('drops blanks and case-insensitive repeats, keeping the first spelling', () => {
    expect(parseTags('Work,, ,work,WORK')).toEqual(['Work']);
  });

  it('returns nothing for empty input', () => {
    expect(parseTags('')).toEqual([]);
  });
});

describe('newId', () => {
  it('returns distinct ids', () => {
    expect(newId()).not.toEqual(newId());
  });
});

describe('note operations', () => {
  it('adds a note that is not on the board', () => {
    const { notes } = addNote(defaultData(), draft);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ ...draft, columnId: null });
  });

  it('updates only the matching note and keeps its column', () => {
    let data = addNote(addNote(defaultData(), draft), { ...draft, title: 'Other' });
    const [first, second] = data.notes;
    data = moveNote(data, first.id, 'todo');
    data = updateNote(data, first.id, { ...draft, title: 'New', description: '', tags: [] });

    const byId = (id: string) => data.notes.find((note) => note.id === id);
    expect(byId(first.id)).toMatchObject({ title: 'New', columnId: 'todo', createdAt: first.createdAt });
    expect(byId(second.id)).toEqual(second);
  });

  it('deletes only the matching note', () => {
    const data = addNote(addNote(defaultData(), draft), { ...draft, title: 'Other' });
    expect(deleteNote(data, data.notes[0].id).notes.map((note) => note.title)).toEqual(['Other']);
  });

  it('moves a note between columns and off the board', () => {
    let data = addNote(defaultData(), draft);
    const { id } = data.notes[0];
    data = moveNote(data, id, 'done');
    expect(data.notes[0].columnId).toBe('done');
    expect(moveNote(data, id, null).notes[0].columnId).toBeNull();
  });
});

describe('ordering within a column', () => {
  function boardWith(...titles: string[]) {
    let data = defaultData();
    for (const title of titles) data = addNote(data, { ...draft, title });
    for (const note of data.notes) data = moveNote(data, note.id, 'todo');
    return data;
  }
  const order = (data: ReturnType<typeof defaultData>, columnId = 'todo') =>
    notesInColumn(data, columnId).map((note) => note.title);
  const idOf = (data: ReturnType<typeof defaultData>, title: string) => data.notes.find((note) => note.title === title)!.id;

  it('puts a note at a position among the other notes', () => {
    const data = boardWith('A', 'B', 'C');
    expect(order(moveNote(data, idOf(data, 'C'), 'todo', 0))).toEqual(['C', 'A', 'B']);
    expect(order(moveNote(data, idOf(data, 'A'), 'todo', 1))).toEqual(['B', 'A', 'C']);
    expect(order(moveNote(data, idOf(data, 'A'), 'todo', 2))).toEqual(['B', 'C', 'A']);
  });

  it('puts a note last when no position is given', () => {
    const data = boardWith('A', 'B');
    const withNew = addNote(data, { ...draft, title: 'New' });
    expect(order(moveNote(withNew, idOf(withNew, 'New'), 'todo'))).toEqual(['A', 'B', 'New']);
  });

  it('inserts into another column at a position', () => {
    let data = boardWith('A', 'B');
    data = moveNote(data, idOf(data, 'B'), 'done');
    data = moveNote(data, idOf(data, 'A'), 'done', 0);
    expect(order(data, 'done')).toEqual(['A', 'B']);
    expect(order(data)).toEqual([]);
  });

  it('keeps a note in place in the array when it leaves the board', () => {
    const data = boardWith('A', 'B', 'C');
    expect(moveNote(data, idOf(data, 'B'), null).notes.map((note) => note.title)).toEqual(['A', 'B', 'C']);
  });
});

describe('tag colours', () => {
  it('is the same for the same tag in any case, and within range', () => {
    expect(tagColour('Work')).toBe(tagColour('work'));
    for (const tag of ['a', 'home', 'urgent', 'ideas', 'x'.repeat(50)]) {
      expect(tagColour(tag)).toBeGreaterThanOrEqual(0);
      expect(tagColour(tag)).toBeLessThan(6);
    }
  });
});

describe('column operations', () => {
  it('renames, moves and deletes columns, taking notes off the board', () => {
    let data = addNote(defaultData(), draft);
    data = moveNote(data, data.notes[0].id, 'done');
    data = renameColumn(data, 'done', ' Finished ');
    expect(data.columns.at(-1)?.name).toBe('Finished');

    data = moveColumn(data, 'done', -1);
    expect(data.columns.map((column) => column.id)).toEqual(['todo', 'done', 'in-progress']);
    expect(moveColumn(data, 'todo', -1)).toBe(data);

    data = deleteColumn(data, 'done');
    expect(data.columns.map((column) => column.id)).toEqual(['todo', 'in-progress']);
    expect(data.notes[0].columnId).toBeNull();
  });

  it('checks names against other columns only', () => {
    expect(isColumnNameTaken(defaultData(), 'done', 'done')).toBe(false);
    expect(isColumnNameTaken(defaultData(), 'done', 'todo')).toBe(true);
  });
});

describe('columns', () => {
  it('adds a column with a trimmed name', () => {
    const { columns } = addColumn(defaultData(), '  Review ');
    expect(columns.at(-1)?.name).toBe('Review');
  });

  it('compares names ignoring case and surrounding spaces', () => {
    expect(isColumnNameTaken(defaultData(), ' DONE ')).toBe(true);
    expect(isColumnNameTaken(defaultData(), 'Review')).toBe(false);
  });
});

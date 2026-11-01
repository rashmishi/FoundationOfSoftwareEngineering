import { describe, expect, it } from 'vitest';
import {
  addColumn,
  addNote,
  defaultData,
  deleteNote,
  isColumnNameTaken,
  moveNote,
  newId,
  parseTags,
  updateNote,
} from './notes';

const draft = { title: 'Title', description: 'Description', tags: ['tag'] };

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
    data = updateNote(data, first.id, { title: 'New', description: '', tags: [] });

    expect(data.notes[0]).toMatchObject({ title: 'New', columnId: 'todo', createdAt: first.createdAt });
    expect(data.notes[1]).toEqual(second);
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

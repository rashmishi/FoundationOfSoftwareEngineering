export interface Note {
  id: string;
  title: string;
  description: string;
  tags: string[];
  /** The board column holding this note, or null if it is not on the board. */
  columnId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
}

export interface BoardData {
  notes: Note[];
  columns: Column[];
}

/** The fields a user enters for a note. */
export type NoteDraft = Pick<Note, 'title' | 'description' | 'tags'>;

/** Where a note is being shown. Each note can appear in both places. */
export type NoteLocation = 'list' | 'board';

/** A note picked up with the keyboard, on its way to a column. */
export interface HeldNote {
  noteId: string;
  location: NoteLocation;
  targetColumnId: string | null;
}

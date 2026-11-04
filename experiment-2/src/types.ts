export type Priority = 'none' | 'low' | 'medium' | 'high';

export interface Note {
  id: string;
  title: string;
  description: string;
  tags: string[];
  priority: Priority;
  /** A local calendar date as YYYY-MM-DD, or null for no due date. */
  dueDate: string | null;
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
  /** Notes in a column appear on the board in the order they have here. */
  notes: Note[];
  columns: Column[];
}

/** The fields a user enters for a note. */
export type NoteDraft = Pick<Note, 'title' | 'description' | 'tags' | 'priority' | 'dueDate'>;

/** Where a note is being shown. Each note can appear in both places. */
export type NoteLocation = 'list' | 'board';

/** A note picked up with the keyboard, on its way to a column. */
export interface HeldNote {
  noteId: string;
  location: NoteLocation;
  targetColumnId: string | null;
  /** The position among the target column's other notes. */
  targetIndex: number | null;
}

export type ReorderTarget = 'up' | 'down' | 'top' | 'bottom';

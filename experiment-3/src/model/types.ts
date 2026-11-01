export type Id = string;

export interface Column {
  id: Id;
  name: string;
}

export interface Note {
  id: Id;
  title: string;
  description: string;
  tags: string[];
  /** null = "Not on board". */
  columnId: Id | null;
  createdAt: string;
  updatedAt: string;
  /** Time of the last column assignment; orders cards inside a column. */
  movedAt: string | null;
}

export interface AppState {
  notes: Note[];
  columns: Column[];
}

export type Variant = 'list' | 'board';

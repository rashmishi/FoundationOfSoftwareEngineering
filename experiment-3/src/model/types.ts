export type Priority = 'none' | 'low' | 'medium' | 'high';

export const PRIORITIES: readonly Priority[] = ['none', 'low', 'medium', 'high'];

export interface Note {
  id: string;
  title: string;
  description: string;
  tags: string[];
  priority: Priority;
  /** Local calendar date, 'YYYY-MM-DD', or null when there is no due date. */
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  collapsed: boolean;
  /** Order of notes within the column. */
  noteIds: string[];
}

export interface BoardState {
  /** Note list order: newest first. */
  notes: Note[];
  /** Board columns, left to right. */
  columns: Column[];
}

export const EXPORT_FORMAT = 'notes-kanban';
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  notes: Note[];
  columns: Column[];
}

/** Where a note card is rendered. A note is always in the list and may also be on the board. */
export type Place = 'list' | 'board';

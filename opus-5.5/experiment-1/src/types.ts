export type Priority = 'none' | 'low' | 'medium' | 'high';

export const PRIORITIES: readonly Priority[] = ['none', 'low', 'medium', 'high'];

export const PRIORITY_LABELS: Record<Priority, string> = {
  none: 'No priority',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export interface Note {
  id: string;
  title: string;
  description: string;
  tags: string[];
  priority: Priority;
  /** Local calendar date, `YYYY-MM-DD`. */
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  collapsed: boolean;
  /** Notes in this column, top to bottom. */
  noteIds: string[];
}

export interface BoardState {
  /** Newest first. */
  notes: Note[];
  /** Left to right. */
  columns: Column[];
}

/** The editable fields of a note. */
export type NoteDraft = Pick<Note, 'title' | 'description' | 'tags' | 'priority' | 'dueDate'>;

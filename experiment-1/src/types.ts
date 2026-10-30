export interface Note {
  id: string;
  title: string;
  description: string;
  tags: string[];
  /** Id of the Kanban column the note is on, or null when unassigned. */
  columnId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
}

export interface AppState {
  notes: Note[];
  columns: Column[];
}

export interface NoteInput {
  title: string;
  description: string;
  tags: string[];
}

export const EXPORT_APP_ID = 'notes-kanban';
export const SCHEMA_VERSION = 1;

export interface ExportFile extends AppState {
  app: typeof EXPORT_APP_ID;
  version: typeof SCHEMA_VERSION;
  exportedAt: string;
}

export const LIMITS = {
  title: 200,
  description: 5000,
  tag: 50,
  columnName: 60,
} as const;

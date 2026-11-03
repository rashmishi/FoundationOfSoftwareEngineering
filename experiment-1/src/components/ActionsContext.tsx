import { createContext, useContext } from 'react';
import type { Column } from '../types';

/** User-level commands defined in App; each one dispatches, plays a sound and shows a toast. */
export interface Actions {
  columns: Column[];
  today: string;
  query: string;
  editNote: (id: string) => void;
  deleteNote: (id: string) => void;
  renameNote: (id: string, title: string) => string | null;
  duplicateNote: (id: string) => void;
  moveNote: (id: string, columnId: string | null, beforeId: string | null) => void;
  shiftNote: (id: string, offset: -1 | 1) => void;
  renameColumn: (id: string, name: string) => string | null;
  toggleColumn: (id: string) => void;
  moveColumn: (id: string, offset: -1 | 1) => void;
  deleteColumn: (id: string) => void;
  playPick: () => void;
}

export const ActionsContext = createContext<Actions | null>(null);

export function useActions(): Actions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useActions must be used inside ActionsContext');
  return actions;
}

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BoardState, Place } from '../model/types';

export type DialogSpec =
  | { type: 'edit'; noteId: string }
  | { type: 'move'; noteId: string; place: Place; origin: 'toolbar' | 'menu' }
  | { type: 'deleteNote'; noteId: string; place: Place }
  | { type: 'renameColumn'; columnId: string }
  | { type: 'deleteColumn'; columnId: string }
  | { type: 'import'; state: BoardState; fileName: string }
  | { type: 'settings' }
  | { type: 'help' };

interface DialogValue {
  dialog: DialogSpec | null;
  openDialog: (spec: DialogSpec) => void;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const value = useMemo(() => ({ dialog, openDialog: setDialog, closeDialog: () => setDialog(null) }), [dialog]);
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

export function useDialogs(): DialogValue {
  const value = useContext(DialogContext);
  if (!value) throw new Error('useDialogs outside DialogProvider');
  return value;
}

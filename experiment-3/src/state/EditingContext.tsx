import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Variant } from '../model/types';

interface Editing {
  /** Note id being edited, per variant (one at a time in the list and one on the board). */
  editing: Record<Variant, string | null>;
  setEditing: (variant: Variant, noteId: string | null) => void;
}

const EditingContext = createContext<Editing | null>(null);

export function EditingProvider({ children }: { children: ReactNode }) {
  const [editing, setState] = useState<Record<Variant, string | null>>({ list: null, board: null });
  const value = useMemo<Editing>(
    () => ({ editing, setEditing: (variant, noteId) => setState((s) => ({ ...s, [variant]: noteId })) }),
    [editing],
  );
  return <EditingContext.Provider value={value}>{children}</EditingContext.Provider>;
}

export function useEditing(): Editing {
  const ctx = useContext(EditingContext);
  if (!ctx) throw new Error('useEditing must be used inside EditingProvider');
  return ctx;
}

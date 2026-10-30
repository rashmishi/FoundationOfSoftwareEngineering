import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { AppState } from '../types';
import { notesReducer, type Action } from './notesReducer';
import { loadState, saveState } from './storage';

export interface Status {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

interface NotesContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  status: Status | null;
  announce: (kind: Status['kind'], text: string) => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: AppState;
}) {
  const [state, dispatch] = useReducer(notesReducer, initialState, (init) => init ?? loadState());
  const [status, setStatus] = useState<Status | null>(null);
  const counter = useRef(0);

  const announce = useCallback((kind: Status['kind'], text: string) => {
    counter.current += 1;
    setStatus({ id: counter.current, kind, text });
  }, []);

  useEffect(() => {
    if (!saveState(state)) {
      announce('error', 'Your changes could not be saved in this browser (storage is full or disabled).');
    }
  }, [state, announce]);

  const value = useMemo(() => ({ state, dispatch, status, announce }), [state, status, announce]);
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used inside <NotesProvider>');
  return ctx;
}

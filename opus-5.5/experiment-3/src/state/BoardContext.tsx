import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { newId } from '../model/ids';
import { boardReducer, type BoardAction } from '../model/reducer';
import { loadBoard, saveBoard, type LoadStatus } from '../model/storage';
import type { BoardState } from '../model/types';
import { useFocusManager, type FocusTarget } from './FocusContext';
import { usePreferences } from './PreferencesContext';
import { useToasts } from './ToastContext';

export interface UndoOptions {
  /** What Undo will do, for button names: "delete note "Buy milk"". */
  label: string;
  /** Text shown after undoing: "Note "Buy milk" restored." */
  undoneText: string;
  /** Undo restores something that was deleted: focus goes to it (FR-22). */
  restoreFocus?: FocusTarget[];
  /** Undo of a move/edit/import from a toast, when the previous focus is gone. */
  affectedFocus?: FocusTarget[];
}

interface UndoEntry extends UndoOptions {
  id: string;
  snapshot: BoardState;
}

export type UndoSource = 'toast' | 'header' | 'shortcut';

interface BoardValue {
  state: BoardState;
  loadStatus: LoadStatus;
  /** Apply an action. With undo options, the previous state becomes the (single) undo entry. Returns its id. */
  commit: (action: BoardAction, undo?: UndoOptions) => string | undefined;
  lastUndo: UndoEntry | null;
  undo: (source: UndoSource, returnTo?: HTMLElement | null) => void;
}

const BoardContext = createContext<BoardValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadBoard);
  const [state, dispatch] = useReducer(boardReducer, initial.state);
  const [lastUndo, setLastUndo] = useState<UndoEntry | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const { notify, regionRef, returnTarget } = useToasts();
  const { requestFocus } = useFocusManager();
  const { play } = usePreferences();

  // Persist after every change (FR-3.1); report failures once until saving works again (FR-3.4).
  const saveFailed = useRef(false);
  useEffect(() => {
    const ok = saveBoard(state);
    if (!ok && !saveFailed.current) {
      notify({ text: 'Your last change could not be saved. Export your notes to keep a copy.', kind: 'error' });
      play('error');
    }
    saveFailed.current = !ok;
  }, [state, notify, play]);

  const commit = useCallback<BoardValue['commit']>((action, undo) => {
    let id: string | undefined;
    if (undo) {
      id = newId('undo');
      setLastUndo({ ...undo, id, snapshot: stateRef.current });
      stateRef.current = boardReducer(stateRef.current, action);
    }
    dispatch(action);
    return id;
  }, []);

  const undo = useCallback<BoardValue['undo']>((source, returnTo) => {
    if (!lastUndo) return;
    dispatch({ type: 'replaceAll', state: lastUndo.snapshot });
    setLastUndo(null);
    play('undo');
    notify({ text: `Undo: ${lastUndo.undoneText}`, kind: 'info' });
    // Focus after undo is decided only here (FR-22).
    const inToast = regionRef.current?.contains(document.activeElement) ?? false;
    if (lastUndo.restoreFocus) requestFocus(...lastUndo.restoreFocus);
    else if (source === 'toast') requestFocus(returnTo, ...(lastUndo.affectedFocus ?? []));
    // Shortcut pressed while in a toast whose Undo button is about to go: leave the toast region (FR-22).
    else if (inToast) requestFocus(returnTarget(), ...(lastUndo.affectedFocus ?? []));
  }, [lastUndo, notify, play, requestFocus, regionRef, returnTarget]);

  const value = useMemo(
    () => ({ state, loadStatus: initial.status, commit, lastUndo, undo }),
    [state, initial.status, commit, lastUndo, undo],
  );
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard(): BoardValue {
  const value = useContext(BoardContext);
  if (!value) throw new Error('useBoard outside BoardProvider');
  return value;
}

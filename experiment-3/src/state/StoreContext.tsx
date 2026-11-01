import { createContext, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { reducer, type Action } from '../model/reducer';
import { loadState, saveState, SAVE_ERROR } from '../model/storage';
import type { AppState } from '../model/types';
import { useAnnouncer } from './AnnouncerContext';

interface Store {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { showBanner } = useAnnouncer();
  const loadError = useRef<string | undefined>();
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const loaded = loadState();
    loadError.current = loaded.error;
    return loaded.state;
  });
  const saveFailed = useRef(false);

  useEffect(() => {
    // Inserted after the first paint so the (already rendered) alert region announces it.
    if (loadError.current) showBanner(loadError.current);
  }, [showBanner]);

  useEffect(() => {
    const ok = saveState(state);
    if (!ok && !saveFailed.current) showBanner(SAVE_ERROR);
    saveFailed.current = !ok;
  }, [state, showBanner]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

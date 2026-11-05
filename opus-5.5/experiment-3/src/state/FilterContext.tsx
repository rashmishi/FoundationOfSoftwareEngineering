import { createContext, useCallback, useContext, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { todayISO } from '../model/dates';
import { hasActiveFilters, NO_FILTERS, noteMatches, type Filters } from '../model/selectors';
import type { Note } from '../model/types';
import { useBoard } from './BoardContext';

interface FilterValue {
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  active: boolean;
  /** Ids of notes that match the (deferred) filters. */
  matchingIds: Set<string>;
  /** True once the deferred results match the current filters. */
  settled: boolean;
  today: string;
}

const FilterContext = createContext<FilterValue | null>(null);

/** Today's date, refreshed every minute and when the tab becomes visible (FR-10.4). */
export function useToday(): string {
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const update = () => setToday(todayISO());
    const timer = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return today;
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const { state } = useBoard();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const deferred = useDeferredValue(filters);
  const today = useToday();

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);
  const clearFilters = useCallback(() => setFilters(NO_FILTERS), []);

  const matchingIds = useMemo(() => {
    const columnName = new Map<string, string>();
    for (const c of state.columns) for (const id of c.noteIds) columnName.set(id, c.name);
    return new Set(state.notes.filter((n: Note) => noteMatches(n, deferred, columnName.get(n.id), today)).map((n) => n.id));
  }, [state, deferred, today]);

  const value = useMemo(
    () => ({ filters, setFilter, clearFilters, active: hasActiveFilters(filters), matchingIds, settled: deferred === filters, today }),
    [filters, deferred, setFilter, clearFilters, matchingIds, today],
  );
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterValue {
  const value = useContext(FilterContext);
  if (!value) throw new Error('useFilters outside FilterProvider');
  return value;
}

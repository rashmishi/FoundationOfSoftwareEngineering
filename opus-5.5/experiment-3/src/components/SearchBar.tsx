import { useEffect, useId, useRef } from 'react';
import { allTags, plural, type DueFilter, type Filters } from '../model/selectors';
import type { Priority } from '../model/types';
import { useAnnouncer } from '../state/AnnouncerContext';
import { useBoard } from '../state/BoardContext';
import { useFilters } from '../state/FilterContext';

const QUERY_PAUSE = 500;
const SELECT_PAUSE = 150;

export function SearchBar() {
  const { state } = useBoard();
  const { filters, setFilter, clearFilters, active, matchingIds, settled } = useFilters();
  const { announce } = useAnnouncer();
  const id = useId();
  const tags = allTags(state.notes);
  const total = state.notes.length;
  const shown = matchingIds.size;

  // Announce the result count exactly once per filter change (FR-9.3): QUERY_PAUSE after typing stops, and
  // shortly after a select changes (time for the deferred results to render). Changes to the notes themselves
  // (create, delete, import) do not trigger it; their own messages cover them.
  const latest = useRef({ shown, total, active, settled });
  latest.current = { shown, total, active, settled };
  const previous = useRef<Filters>(filters);
  const timer = useRef<number>();
  useEffect(() => {
    const prev = previous.current;
    if (prev === filters) return;
    previous.current = filters;
    const onlyQuery =
      prev.tag === filters.tag && prev.priority === filters.priority && prev.due === filters.due && prev.query !== filters.query;
    window.clearTimeout(timer.current);
    const fire = () => {
      const { shown: n, total: t, active: a, settled: done } = latest.current;
      // With many notes the deferred results may still be rendering; wait so the count is never stale.
      if (!done) {
        timer.current = window.setTimeout(fire, 50);
        return;
      }
      announce(a ? `Showing ${n} of ${plural(t, 'note')}.` : `Showing all ${plural(t, 'note')}.`);
    };
    timer.current = window.setTimeout(fire, onlyQuery ? QUERY_PAUSE : SELECT_PAUSE);
  }, [filters, announce]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="panel search-panel" role="search" aria-label="Search and filter notes">
      <div className="search-fields">
        <div className="field search-field">
          <label htmlFor={`${id}-q`}>Search notes</label>
          <input
            id={`${id}-q`}
            type="search"
            autoComplete="off"
            value={filters.query}
            aria-describedby={`${id}-count`}
            onChange={(e) => setFilter('query', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && filters.query) {
                e.preventDefault();
                setFilter('query', '');
              }
            }}
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-tag`}>Tag</label>
          <select id={`${id}-tag`} value={filters.tag} onChange={(e) => setFilter('tag', e.target.value)}>
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-prio`}>Priority</label>
          <select id={`${id}-prio`} value={filters.priority} onChange={(e) => setFilter('priority', e.target.value as Priority | 'any')}>
            <option value="any">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="none">None</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-due`}>Due date</label>
          <select id={`${id}-due`} value={filters.due} onChange={(e) => setFilter('due', e.target.value as DueFilter)}>
            <option value="any">Any</option>
            <option value="overdue">Overdue</option>
            <option value="week">Due in the next 7 days</option>
            <option value="none">No due date</option>
          </select>
        </div>
      </div>
      <div className="search-status">
        <p id={`${id}-count`}>{active ? `Showing ${shown} of ${plural(total, 'note')}` : `Showing all ${plural(total, 'note')}`}</p>
        <button type="button" className="button small" onClick={clearFilters} aria-disabled={!active || undefined}>
          Clear filters
        </button>
      </div>
    </div>
  );
}

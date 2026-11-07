import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { PRIORITY_LABELS } from '../lib/noteModel.js';
import { emptyFilters, isFiltering } from '../lib/filter.js';

/** Search and filters. Results update as you type; the count is announced politely after a short pause. */
export function FilterBar({ filters, onChange, tags, columns, shown, total }) {
  const filtering = isFiltering(filters);
  const set = (patch) => onChange({ ...filters, ...patch });

  const summary = filtering ? `Showing ${shown} of ${total} ${total === 1 ? 'note' : 'notes'}.` : `${total} ${total === 1 ? 'note' : 'notes'}.`;

  // Announce the result count once typing pauses, not on every keystroke.
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    if (!filtering) {
      setAnnounced('');
      return undefined;
    }
    const t = setTimeout(() => setAnnounced(summary), 600);
    return () => clearTimeout(t);
  }, [summary, filtering]);

  return (
    <form className="filters" role="search" aria-label="Search and filter notes" onSubmit={(e) => e.preventDefault()}>
      <div className="field filter-search">
        <label htmlFor="search-notes" className="field-label">
          Search notes
        </label>
        <div className="search-box">
          <Icon name="search" />
          <input
            id="search-notes"
            type="search"
            className="input"
            value={filters.query}
            autoComplete="off"
            placeholder="Search titles, descriptions and tags"
            onChange={(e) => set({ query: e.target.value })}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="filter-priority" className="field-label">
          Priority
        </label>
        <select id="filter-priority" className="input select" value={filters.priority} onChange={(e) => set({ priority: e.target.value })}>
          <option value="any">Any priority</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {value === 'none' ? 'No priority set' : label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="filter-tag" className="field-label">
          Tag
        </label>
        <select id="filter-tag" className="input select" value={filters.tag} onChange={(e) => set({ tag: e.target.value })}>
          <option value="any">Any tag</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="filter-column" className="field-label">
          Column
        </label>
        <select id="filter-column" className="input select" value={filters.column} onChange={(e) => set({ column: e.target.value })}>
          <option value="any">Any column</option>
          <option value="none">Not on the board</option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="filter-due" className="field-label">
          Due date
        </label>
        <select id="filter-due" className="input select" value={filters.due} onChange={(e) => set({ due: e.target.value })}>
          <option value="any">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="week">Next 7 days</option>
          <option value="none">No due date</option>
        </select>
      </div>

      <div className="filter-actions">
        <button type="button" className="btn" disabled={!filtering} onClick={() => onChange(emptyFilters)}>
          <Icon name="x" />
          Clear filters
        </button>
        <p className="filter-summary">{summary}</p>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {announced}
      </span>
    </form>
  );
}

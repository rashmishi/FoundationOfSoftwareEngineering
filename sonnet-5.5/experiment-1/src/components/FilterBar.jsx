import { useApp } from '../context.js';
import { allTags, hasActiveFilters, matchesFilters } from '../lib/store.js';
import { PRIORITY_LABEL } from './Badges.jsx';
import Icon from './Icon.jsx';

/** Search and filters. Results update on every keystroke. */
export default function FilterBar() {
  const { state, today, filters, actions } = useApp();
  const matches = state.notes.filter((n) => matchesFilters(state, n, filters, today)).length;
  const set = (patch) => actions.setFilters({ ...filters, ...patch });
  const active = hasActiveFilters(filters);

  return (
    <div className="filters" role="search" aria-label="Search and filter notes">
      <div className="search">
        <label htmlFor="search-input" className="vh">
          Search notes
        </label>
        <span className="search-icon">
          <Icon name="search" size={16} />
        </span>
        <input
          id="search-input"
          type="search"
          placeholder="Search title, description or tag"
          value={filters.q}
          autoComplete="off"
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>

      <label className="filter-select">
        <span>Priority</span>
        <select value={filters.priority} onChange={(e) => set({ priority: e.target.value })}>
          <option value="all">All</option>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-select">
        <span>Tag</span>
        <select value={filters.tag} onChange={(e) => set({ tag: e.target.value })}>
          <option value="all">All</option>
          {allTags(state).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="check">
        <input type="checkbox" checked={filters.overdue} onChange={(e) => set({ overdue: e.target.checked })} />
        <span>Overdue only</span>
      </label>

      <p className="result-count" role="status" aria-live="polite">
        {active ? `Showing ${matches} of ${state.notes.length} notes` : `${state.notes.length} ${state.notes.length === 1 ? 'note' : 'notes'}`}
      </p>
      {active && (
        <button type="button" className="btn btn-sm" onClick={actions.clearFilters}>
          Clear
        </button>
      )}
    </div>
  );
}

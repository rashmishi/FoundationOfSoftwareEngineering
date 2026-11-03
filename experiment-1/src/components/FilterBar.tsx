import { EMPTY_FILTERS, type DueFilter, type Filters } from '../model/filter';
import { PRIORITIES, PRIORITY_LABELS, type Priority } from '../types';
import { CloseIcon, SearchIcon } from './Icons';

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  tags: string[];
  active: boolean;
}

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'any', label: 'Any due date' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due within 7 days' },
  { value: 'none', label: 'No due date' },
];

export function FilterBar({ filters, onChange, tags, active }: FilterBarProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  return (
    <div role="search" className="filter-bar" aria-label="Search and filter notes">
      <div className="search-box">
        <SearchIcon />
        <input
          type="search"
          className="input"
          aria-label="Search notes"
          placeholder="Search title, description, tags…"
          value={filters.query}
          onChange={(e) => set('query', e.target.value)}
        />
      </div>
      <select className="input" aria-label="Filter by tag" value={filters.tag} onChange={(e) => set('tag', e.target.value)}>
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select className="input" aria-label="Filter by priority" value={filters.priority} onChange={(e) => set('priority', e.target.value as Priority | '')}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
      <select className="input" aria-label="Filter by due date" value={filters.due} onChange={(e) => set('due', e.target.value as DueFilter)}>
        {DUE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {active && (
        <button type="button" className="button button-ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          <CloseIcon size={16} /> Clear
        </button>
      )}
    </div>
  );
}

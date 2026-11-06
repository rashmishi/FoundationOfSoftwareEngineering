import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { ANY, countActiveFilters, DEFAULT_FILTERS, filterNotes, NOT_ON_BOARD, uniqueTags, type Filters } from '../filters';
import { formatCount } from '../format';
import { PRIORITY_LABELS } from '../notes';
import type { Column, HeldNote, Note } from '../types';
import { NoteCard, type NoteActions } from './NoteCard';

export const NOTES_HEADING_ID = 'notes-heading';

/** Waits for typing to pause, so a screen reader is not interrupted on every key. */
const ANNOUNCE_DELAY_MS = 700;

interface NoteListProps {
  notes: Note[];
  columns: Column[];
  today: string;
  draggingId: string | null;
  held: HeldNote | null;
  actions: NoteActions;
  onExport: () => void;
  onImport: (file: File) => void;
}

interface FilterField {
  key: keyof Filters;
  label: string;
  options: { value: string; label: string }[];
}

export function NoteList({ notes, columns, today, draggingId, held, actions, onExport, onImport }: NoteListProps) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const importHintId = `${id}-import-hint`;
  const filtersId = `${id}-filters`;
  const visibleNotes = filterNotes(notes, search, filters, today);
  const onBoardCount = notes.filter((note) => note.columnId).length;
  const activeFilterCount = countActiveFilters(filters);
  const isNarrowed = search.trim() !== '' || activeFilterCount > 0;

  useEffect(() => {
    if (!isNarrowed) {
      setAnnouncement('');
      return;
    }
    const timer = setTimeout(
      () => setAnnouncement(`Found ${formatCount(visibleNotes.length, 'note')} out of ${notes.length}.`),
      ANNOUNCE_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [isNarrowed, visibleNotes.length, notes.length]);

  const filterFields: FilterField[] = [
    {
      key: 'priority',
      label: 'Priority',
      options: [
        { value: ANY, label: 'Any priority' },
        ...(['high', 'medium', 'low', 'none'] as const).map((value) => ({ value, label: PRIORITY_LABELS[value] })),
      ],
    },
    {
      key: 'tag',
      label: 'Tag',
      options: [{ value: ANY, label: 'Any tag' }, ...uniqueTags(notes).map((tag) => ({ value: tag, label: tag }))],
    },
    {
      key: 'column',
      label: 'Board column',
      options: [
        { value: ANY, label: 'Any column' },
        { value: NOT_ON_BOARD, label: 'Not on board' },
        ...columns.map((column) => ({ value: column.id, label: column.name })),
      ],
    },
    {
      key: 'due',
      label: 'Due date',
      options: [
        { value: ANY, label: 'Any due date' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'today', label: 'Due today' },
        { value: 'week', label: 'Due in the next 7 days' },
        { value: 'none', label: 'No due date' },
      ],
    },
    {
      key: 'sort',
      label: 'Sort by',
      options: [
        { value: 'oldest', label: 'Oldest first' },
        { value: 'newest', label: 'Newest first' },
        { value: 'due', label: 'Due date, soonest first' },
        { value: 'priority', label: 'Priority, highest first' },
        { value: 'title', label: 'Title, A to Z' },
      ],
    },
  ];

  function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clearing the value lets the user choose the same file again.
    event.target.value = '';
    if (file) onImport(file);
  }

  return (
    <section className="panel" aria-labelledby={NOTES_HEADING_ID}>
      <div className="panel-header">
        <h2 id={NOTES_HEADING_ID} tabIndex={-1}>
          Notes
        </h2>
        <p className="count">
          {isNarrowed
            ? `Showing ${visibleNotes.length} of ${formatCount(notes.length, 'note')}`
            : `${formatCount(notes.length, 'note')}, ${onBoardCount} on the board`}
        </p>
        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </div>

      <div className="button-row">
        <button type="button" className="button" onClick={onExport}>
          Export notes
        </button>
        <button
          type="button"
          className="button"
          aria-describedby={importHintId}
          onClick={() => fileInputRef.current?.click()}
        >
          Import notes
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="import-file"
          onChange={handleFileChosen}
        />
      </div>
      <p id={importHintId} className="field-note">
        Import a JSON file that you exported from this app. Your current notes are kept.
      </p>

      {notes.length > 0 && (
        <div role="search" aria-label="Search and filter notes" className="search">
          <div className="add-column">
            <div className="field">
              <label htmlFor={`${id}-search`}>Search notes</label>
              <input
                ref={searchRef}
                id={`${id}-search`}
                type="search"
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {search && (
              <button
                type="button"
                className="button"
                onClick={() => {
                  setSearch('');
                  searchRef.current?.focus();
                }}
              >
                Clear search
              </button>
            )}
          </div>

          <button
            type="button"
            className="button"
            aria-expanded={showFilters}
            aria-controls={filtersId}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters{activeFilterCount > 0 && ` (${activeFilterCount} on)`}
          </button>

          <div id={filtersId} className="filters" hidden={!showFilters}>
            {filterFields.map(({ key, label, options }) => (
              <div key={key} className="field">
                <label htmlFor={`${id}-${key}`}>{label}</label>
                <select
                  id={`${id}-${key}`}
                  value={filters[key]}
                  onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
                >
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {activeFilterCount > 0 && (
              <button type="button" className="button" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {notes.length === 0 && <p className="empty">No notes yet. Add one with the form above, or import a file.</p>}
      {notes.length > 0 && visibleNotes.length === 0 && (
        <p className="empty">No notes match your search or filters. Check the spelling or clear a filter.</p>
      )}
      {visibleNotes.length > 0 && (
        <ul className="note-stack" role="list">
          {visibleNotes.map((note) => (
            <li key={note.id}>
              <NoteCard
                note={note}
                columns={columns}
                location="list"
                headingLevel="h3"
                today={today}
                draggingId={draggingId}
                held={held}
                actions={actions}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

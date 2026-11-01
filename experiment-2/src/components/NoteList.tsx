import { useId, useRef, useState, type ChangeEvent } from 'react';
import { formatCount } from '../format';
import type { Column, HeldNote, Note } from '../types';
import { NoteCard, type NoteActions } from './NoteCard';

export const NOTES_HEADING_ID = 'notes-heading';

interface NoteListProps {
  notes: Note[];
  columns: Column[];
  draggingId: string | null;
  held: HeldNote | null;
  actions: NoteActions;
  onExport: () => void;
  onImport: (file: File) => void;
}

function matchesSearch(note: Note, search: string): boolean {
  const text = [note.title, note.description, ...note.tags].join(' ').toLowerCase();
  return text.includes(search.trim().toLowerCase());
}

export function NoteList({ notes, columns, draggingId, held, actions, onExport, onImport }: NoteListProps) {
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const importHintId = `${id}-import-hint`;
  const visibleNotes = notes.filter((note) => matchesSearch(note, search));
  const onBoardCount = notes.filter((note) => note.columnId).length;

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
        <p className="count" aria-live="polite">
          {search.trim()
            ? `Showing ${visibleNotes.length} of ${formatCount(notes.length, 'note')}`
            : `${formatCount(notes.length, 'note')}, ${onBoardCount} on the board`}
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
        <div role="search" className="add-column">
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
      )}

      {notes.length === 0 && <p className="empty">No notes yet. Add one with the form above, or import a file.</p>}
      {notes.length > 0 && visibleNotes.length === 0 && (
        <p className="empty">No notes match your search. Check the spelling or try a different word.</p>
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

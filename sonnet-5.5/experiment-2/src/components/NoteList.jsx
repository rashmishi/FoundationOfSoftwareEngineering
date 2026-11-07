import { useState } from 'react';
import { useBoard } from '../state/board.jsx';
import { useToasts } from '../state/toasts.jsx';
import { NoteCard } from './NoteCard.jsx';
import { Icon } from './Icon.jsx';
import { IconButton } from './IconButton.jsx';
import { buildExport, parseImport, MAX_FILE_BYTES } from '../state/importExport.js';
import { todayISO } from '../lib/dates.js';
import { playSound } from '../lib/sound.js';

function ImportExport() {
  const { state, actions } = useBoard();
  const { notify } = useToasts();
  const [importError, setImportError] = useState('');

  const exportNotes = () => {
    const doc = buildExport(state);
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `notes-board-${todayISO()}.json`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Exported ${state.notes.length} ${state.notes.length === 1 ? 'note' : 'notes'} to the file ${filename}. Look in your Downloads folder.`);
  };

  const fail = (message) => {
    setImportError(message);
    playSound('error');
  };

  const importFile = async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      if (file.size > MAX_FILE_BYTES) {
        fail(`The file “${file.name}” is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB, so nothing was imported. Choose a file exported from this app.`);
        return;
      }
      const result = parseImport(await file.text());
      if (!result.ok) {
        fail(`${result.error}`);
        return;
      }
      setImportError('');
      actions.importData(result.data);
    } catch {
      fail(`The file “${file.name}” could not be read, so nothing was imported. Try choosing it again.`);
    } finally {
      // Allow choosing the same file again.
      input.value = '';
    }
  };

  return (
    <div className="data-tools">
      <button type="button" className="btn" onClick={exportNotes}>
        <Icon name="download" />
        Export notes
      </button>
      <span className="file-button">
        <input id="import-notes-file" className="file-input" type="file" accept="application/json,.json" onChange={importFile} />
        <label htmlFor="import-notes-file" className="btn">
          <Icon name="upload" />
          Import notes
        </label>
      </span>
      {importError && (
        <div className="notice notice-error" role="alert">
          <Icon name="alert" />
          <p>
            <strong>Import failed.</strong> {importError}
          </p>
          <IconButton icon="x" label="Dismiss import message" align="end" onClick={() => setImportError('')} />
        </div>
      )}
    </div>
  );
}

/** The list of all notes (after search and filters). `placement` maps note id -> column id. */
export function NoteList({ notes, total, filtering, placement, onClearFilters }) {
  return (
    <section className="panel" aria-labelledby="notes-heading">
      <div className="panel-head">
        <h2 id="notes-heading" tabIndex={-1} className="panel-title">
          Notes <span className="panel-count">({filtering ? `${notes.length} of ${total}` : total})</span>
        </h2>
      </div>
      <ImportExport />
      <p className="hint">
        Drag a note onto a column in the board, or open its <strong>More actions</strong> menu and choose a “Move to” option. Export saves all notes to a JSON file; Import adds notes from one.
      </p>
      {notes.length > 0 ? (
        <ul className="card-list" aria-label="All notes">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} scope="list" columnId={placement.get(note.id) || null} />
          ))}
        </ul>
      ) : total === 0 ? (
        <p className="empty">You have no notes yet. Fill in the “Add a note” form to create your first one, or choose Import notes to load a file.</p>
      ) : (
        <div className="empty">
          <p>No notes match your search or filters.</p>
          <button type="button" className="btn" onClick={onClearFilters}>
            <Icon name="x" />
            Clear search and filters
          </button>
        </div>
      )}
    </section>
  );
}

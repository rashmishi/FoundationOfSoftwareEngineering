import { useRef, useState } from 'react';
import { exportFileName, MAX_IMPORT_BYTES, parseImport, serialize } from '../model/importExport';
import type { AppState } from '../model/types';
import { useAnnouncer } from '../state/AnnouncerContext';
import { useRequestFocus } from '../state/FocusContext';
import { useStore } from '../state/StoreContext';
import { ConfirmDialog } from './ConfirmDialog';
import { FieldError } from './FieldError';
import { noteCount } from './NotesList';
import { useFieldErrorFocus } from './useFieldErrorFocus';

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** JSON export and import (FR-4). */
export function ImportExport() {
  const { state, dispatch } = useStore();
  const { announce, announceError } = useAnnouncer();
  const requestFocus = useRequestFocus();
  const showFieldError = useFieldErrorFocus();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pending, setPending] = useState<AppState | null>(null);

  const onExport = () => {
    const blob = new Blob([serialize(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    announce(`Exported ${noteCount(state.notes.length)}.`);
  };

  const apply = (next: AppState) => {
    dispatch({ type: 'IMPORT', state: next });
    announce(`Imported ${noteCount(next.notes.length)}.`);
    if (fileRef.current) fileRef.current.value = '';
    requestFocus('notes-heading');
  };

  const onImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      const message = 'Choose a JSON file first.';
      setFileError(message);
      showFieldError('import-file', message);
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      announceError('Import failed: the file is too large (maximum 5 MB).');
      return;
    }
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      announceError('Import failed: the file could not be read.');
      return;
    }
    const result = parseImport(text, state.columns);
    if (!result.ok) {
      announceError(result.error);
      return;
    }
    if (state.notes.length > 0) setPending(result.state);
    else apply(result.state);
  };

  return (
    <section aria-labelledby="io-heading" className="panel">
      <h2 id="io-heading">Import and export</h2>
      <div className="io-grid">
        <div>
          <p className="help-text">Download all notes and board columns as a JSON file.</p>
          <button type="button" className="btn btn-primary" onClick={onExport}>
            Export notes
          </button>
        </div>
        <div>
          <div className="field">
            <label htmlFor="import-file">JSON file to import</label>
            <input
              ref={fileRef}
              id="import-file"
              type="file"
              accept="application/json,.json"
              aria-invalid={fileError ? true : undefined}
              aria-describedby={fileError ? 'import-file-help import-file-error' : 'import-file-help'}
              onChange={() => setFileError(null)}
            />
            <p id="import-file-help" className="help-text">
              Importing replaces your current notes and board columns.
            </p>
            <FieldError id="import-file-error" message={fileError} />
          </div>
          <button id="import-button" type="button" className="btn btn-primary" onClick={onImport}>
            Import
          </button>
        </div>
      </div>
      {pending && (
        <ConfirmDialog
          title="Replace current notes?"
          message={`Importing will replace your ${noteCount(state.notes.length)} and the board columns with the ${noteCount(pending.notes.length)} in the file.`}
          confirmLabel="Replace notes"
          onConfirm={() => {
            const next = pending;
            setPending(null);
            apply(next);
          }}
          onCancel={() => {
            setPending(null);
            requestFocus('import-button');
          }}
        />
      )}
    </section>
  );
}

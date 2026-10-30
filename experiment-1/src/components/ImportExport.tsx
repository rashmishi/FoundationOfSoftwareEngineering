import { useRef, type ChangeEvent } from 'react';
import { useNotes } from '../state/NotesContext';
import { downloadExport, ImportError, parseImport } from '../state/importExport';

export function ImportExport() {
  const { state, dispatch, announce } = useNotes();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const fileName = downloadExport(state);
    const n = state.notes.length;
    announce('success', `Exported ${n} note${n === 1 ? '' : 's'} to ${fileName}.`);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = parseImport(await file.text());
      dispatch({ type: 'importData', data });
      const n = data.notes.length;
      announce('success', `Imported ${n} note${n === 1 ? '' : 's'} from ${file.name}.`);
    } catch (error) {
      const reason = error instanceof ImportError ? error.message : 'The file could not be read.';
      announce('error', `Import failed: ${reason} No notes were changed.`);
    } finally {
      // Allow re-importing the same file.
      input.value = '';
    }
  }

  return (
    <div className="import-export">
      <button type="button" className="button" onClick={handleExport}>
        Export JSON
      </button>
      <button type="button" className="button" onClick={() => fileRef.current?.click()}>
        Import JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        tabIndex={-1}
        aria-label="Import notes from JSON file"
        data-testid="import-input"
        onChange={handleImport}
      />
    </div>
  );
}

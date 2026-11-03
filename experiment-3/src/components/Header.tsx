import { useId, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import { exportFileName, parseImport, serialise } from '../model/importExport';
import { plural } from '../model/selectors';
import { useBoard } from '../state/BoardContext';
import { useDialogs } from '../state/DialogContext';
import { MAIN_HEADING_KEY, useFocusManager } from '../state/FocusContext';
import { focusKeys } from '../state/focusKeys';
import { usePreferences } from '../state/PreferencesContext';
import { useToasts } from '../state/ToastContext';
import { useAnnouncer } from '../state/AnnouncerContext';
import { FieldError } from './FieldError';
import { Icon } from './Icon';

/** FileReader works in every browser (and in test environments without Blob.text). */
function readText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function Header() {
  const { state, lastUndo, undo } = useBoard();
  const { openDialog } = useDialogs();
  const { notify } = useToasts();
  const { announce } = useAnnouncer();
  const { play } = usePreferences();
  const { requestFocus } = useFocusManager();
  const [importError, setImportError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  const headerRef = useRef<HTMLElement>(null);

  // Expose the header height for scroll-padding-top, so focus is never hidden under the sticky header (WCAG 2.4.11).
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => document.documentElement.style.setProperty('--header-space', `${el.offsetHeight}px`);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onExport = () => {
    const name = exportFileName();
    const blob = new Blob([JSON.stringify(serialise(state), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify({ text: `Exported ${plural(state.notes.length, 'note')} to ${name}.` });
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    importButtonRef.current?.focus();
    if (!file) return;
    const result = parseImport(await readText(file));
    if (!result.ok) {
      setImportError(result.error);
      play('error');
      notify({ text: `Import failed. ${result.error}`, kind: 'error' });
      return;
    }
    setImportError(undefined);
    openDialog({ type: 'import', state: result.state, fileName: file.name });
  };

  const undoName = lastUndo ? `Undo, ${lastUndo.label}` : 'Undo, nothing to undo';

  return (
    <header ref={headerRef} className="app-header">
      <h1 tabIndex={-1} data-focus={MAIN_HEADING_KEY}>
        Notes &amp; Kanban Board
      </h1>
      <div className="header-actions" role="group" aria-label="App actions">
        <button
          type="button"
          className="button"
          aria-label={undoName}
          aria-disabled={lastUndo ? undefined : true}
          onClick={() => {
            if (lastUndo) undo('header');
            else announce('Nothing to undo.');
          }}
        >
          <Icon name="undo" />
          <span>Undo</span>
        </button>
        <button type="button" className="button" onClick={onExport}>
          <Icon name="download" />
          <span>Export notes</span>
        </button>
        <span className="import-wrap">
          <button
            ref={importButtonRef}
            type="button"
            className="button"
            data-focus={focusKeys.importButton}
            aria-describedby={importError ? errorId : undefined}
            onClick={() => {
              setImportError(undefined);
              fileRef.current?.click();
            }}
          >
            <Icon name="upload" />
            <span>Import notes</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="visually-hidden-file"
            tabIndex={-1}
            aria-hidden="true"
            onChange={onFile}
          />
        </span>
        <button type="button" className="button" onClick={() => openDialog({ type: 'help' })}>
          <Icon name="help" />
          <span>Keyboard help</span>
        </button>
        <button type="button" className="button" onClick={() => openDialog({ type: 'settings' })}>
          <Icon name="settings" />
          <span>Settings</span>
        </button>
      </div>
      {importError && (
        <div className="import-error">
          <FieldError id={errorId} message={importError} />
          <button
            type="button"
            className="button small"
            onClick={() => {
              setImportError(undefined);
              requestFocus(focusKeys.importButton);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </header>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Board, BOARD_HEADING_ID } from './components/Board';
import { Dialog } from './components/Dialog';
import { DisplaySettings } from './components/DisplaySettings';
import { EditNoteDialog } from './components/EditNoteDialog';
import { HelpContent } from './components/HelpContent';
import { moveButtonId, pickUpButtonId, PICK_UP_INSTRUCTIONS_ID, type NoteActions } from './components/NoteCard';
import { NoteForm } from './components/NoteForm';
import { NoteList, NOTES_HEADING_ID } from './components/NoteList';
import { StatusBar, STATUS_DISMISS_ID, type Message } from './components/StatusBar';
import { formatCount } from './format';
import { addColumn, addNote, deleteNote, isColumnNameTaken, moveNote, updateNote } from './notes';
import { applyPreferences, loadPreferences, onDeviceThemeChange, savePreferences, type Preferences } from './preferences';
import { loadData, onExternalChange, saveData } from './storage';
import { countReplacedNotes, InvalidDataError, MAX_IMPORT_BYTES, mergeImport, parseImport, serializeExport } from './transfer';
import type { BoardData, HeldNote, Note, NoteDraft, NoteLocation } from './types';

const APP_TITLE_ID = 'app-title';
const ADD_NOTE_HEADING_ID = 'add-note-heading';
const MAX_UNDO_STEPS = 20;

type OpenDialog =
  | { kind: 'edit'; note: Note }
  | { kind: 'delete'; note: Note; location: NoteLocation }
  | { kind: 'import'; incoming: BoardData; fileName: string; replacedCount: number }
  | { kind: 'settings' }
  | { kind: 'help' };

interface UndoStep {
  data: BoardData;
  description: string;
}

export default function App() {
  const [initial] = useState(loadData);
  const [data, setData] = useState(initial.data);
  const [undoSteps, setUndoSteps] = useState<UndoStep[]>([]);
  const [message, setMessage] = useState<Message | null>(
    initial.warning ? { kind: 'error', text: initial.warning, sequence: 0 } : null,
  );
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [held, setHeld] = useState<HeldNote | null>(null);
  const [preferences, setPreferences] = useState(loadPreferences);
  const focusAfterRender = useRef<string | null>(null);
  const lastUndoStep = undoSteps.at(-1);

  useEffect(() => {
    if (focusAfterRender.current) {
      // A search can hide the intended target, so fall back to a heading that is always there.
      const target = document.getElementById(focusAfterRender.current) ?? document.getElementById(NOTES_HEADING_ID);
      target?.focus();
      focusAfterRender.current = null;
    }
  });

  useEffect(
    () =>
      onExternalChange(() => {
        setData(loadData().data);
        // These snapshots no longer include what the other tab just saved.
        setUndoSteps([]);
      }),
    [],
  );

  useEffect(() => {
    applyPreferences(preferences);
    return onDeviceThemeChange(() => applyPreferences(preferences));
  }, [preferences]);

  function notify(kind: Message['kind'], text: string, undoable = false) {
    setMessage((previous) => ({ kind, text, undoable, sequence: (previous?.sequence ?? 0) + 1 }));
  }

  /** Saves first, so the screen never shows a change that a refresh would lose. */
  function commit(next: BoardData): boolean {
    try {
      saveData(next);
    } catch {
      notify('error', 'Your change was not saved because browser storage is full or blocked.');
      return false;
    }
    setData(next);
    return true;
  }

  /** Commits a change that the user can undo, and confirms it with a message. */
  function applyChange(next: BoardData, description: string): boolean {
    if (!commit(next)) return false;
    setUndoSteps((steps) => [...steps, { data, description }].slice(-MAX_UNDO_STEPS));
    notify('success', description, true);
    return true;
  }

  function handleUndo() {
    if (!lastUndoStep) {
      notify('info', 'There is nothing to undo yet.');
    } else if (commit(lastUndoStep.data)) {
      setUndoSteps((steps) => steps.slice(0, -1));
      notify('success', `Undone: ${lastUndoStep.description}`);
    }
  }

  function columnName(columnId: string | null): string | undefined {
    return data.columns.find((column) => column.id === columnId)?.name;
  }

  function handleCreate(draft: NoteDraft): boolean {
    return applyChange(addNote(data, draft), `Note "${draft.title}" created.`);
  }

  function handleEdit(note: Note, draft: NoteDraft): boolean {
    const saved = applyChange(updateNote(data, note.id, draft), `Note "${draft.title}" updated.`);
    if (saved) setOpenDialog(null);
    return saved;
  }

  function handleDelete(note: Note, location: NoteLocation) {
    setOpenDialog(null);
    focusAfterRender.current = location === 'board' ? BOARD_HEADING_ID : NOTES_HEADING_ID;
    applyChange(deleteNote(data, note.id), `Note "${note.title}" deleted.`);
  }

  function placeNote(note: Note, columnId: string | null) {
    if (note.columnId === columnId) {
      notify('info', `"${note.title}" is already ${columnId ? `in ${columnName(columnId)}` : 'off the board'}.`);
    } else {
      const description = columnId ? `Moved "${note.title}" to ${columnName(columnId)}.` : `Removed "${note.title}" from the board.`;
      applyChange(moveNote(data, note.id, columnId), description);
    }
  }

  function handleDropNote(noteId: string, columnId: string) {
    const note = data.notes.find((candidate) => candidate.id === noteId);
    if (note) placeNote(note, columnId);
  }

  function handlePickUpOrDrop(note: Note, location: NoteLocation) {
    if (held?.noteId === note.id && held.location === location) {
      setHeld(null);
      // A move between columns remounts the board card, which would lose focus.
      if (location === 'board') focusAfterRender.current = pickUpButtonId('board', note.id);
      placeNote(note, held.targetColumnId);
    } else {
      setHeld({ noteId: note.id, location, targetColumnId: note.columnId });
      notify('info', `Picked up "${note.title}". Press the arrow keys to choose a column, Space to drop, or Esc to cancel.`);
    }
  }

  function handleHeldStep(step: number) {
    if (!held) return;
    const currentIndex = data.columns.findIndex((column) => column.id === held.targetColumnId);
    const index = Math.min(Math.max(currentIndex + step, 0), data.columns.length - 1);
    const column = data.columns[index];
    setHeld({ ...held, targetColumnId: column.id });
    notify('info', `Over ${column.name}, column ${index + 1} of ${data.columns.length}. Press Space to drop here.`);
  }

  function handleHeldCancel() {
    setHeld(null);
    notify('info', 'Note put back. Nothing has moved.');
  }

  function handleAddColumn(name: string): string | null {
    const trimmedName = name.trim();
    if (!trimmedName) return 'Enter a name for the column.';
    if (isColumnNameTaken(data, trimmedName)) return `There is already a column called "${trimmedName}". Enter a different name.`;
    const saved = applyChange(addColumn(data, trimmedName), `Column "${trimmedName}" added.`);
    return saved ? null : 'The column was not saved. Try again.';
  }

  function handleExport() {
    const blob = new Blob([serializeExport(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes-board-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('success', `Exported ${formatCount(data.notes.length, 'note')} to ${link.download}.`);
  }

  function applyImport(incoming: BoardData, fileName: string) {
    applyChange(mergeImport(data, incoming), `Imported ${formatCount(incoming.notes.length, 'note')} from ${fileName}.`);
  }

  async function handleImport(file: File) {
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        throw new InvalidDataError('It is too large to be a Notes Board export.');
      }
      const incoming = parseImport(await file.text());
      const replacedCount = countReplacedNotes(data, incoming);
      if (replacedCount > 0) {
        setOpenDialog({ kind: 'import', incoming, fileName: file.name, replacedCount });
      } else {
        applyImport(incoming, file.name);
      }
    } catch (error) {
      const reason = error instanceof InvalidDataError ? error.message : 'The file could not be read.';
      notify('error', `${file.name} was not imported and your notes are unchanged. ${reason} Choose a JSON file exported from this app.`);
    }
  }

  function handleDismissMessage() {
    setMessage(null);
    focusAfterRender.current = APP_TITLE_ID;
  }

  function handleChangePreferences(next: Preferences) {
    setPreferences(next);
    savePreferences(next);
  }

  const actions: NoteActions = {
    onEdit: (note) => setOpenDialog({ kind: 'edit', note }),
    onDelete: (note, location) => setOpenDialog({ kind: 'delete', note, location }),
    onMove: (note, columnId, location) => {
      // A move between columns remounts the board card, which would lose focus.
      if (location === 'board') {
        focusAfterRender.current = moveButtonId(columnId ? 'board' : 'list', note.id);
      }
      placeNote(note, columnId);
    },
    onDragStart: setDraggingId,
    onDragEnd: () => setDraggingId(null),
    onPickUpOrDrop: handlePickUpOrDrop,
    onHeldStep: handleHeldStep,
    onHeldCancel: handleHeldCancel,
  };

  return (
    <>
      <nav className="skip-links" aria-label="Skip links">
        <a href={`#${ADD_NOTE_HEADING_ID}`}>Skip to add a note</a>
        <a href={`#${NOTES_HEADING_ID}`}>Skip to notes</a>
        <a href={`#${BOARD_HEADING_ID}`}>Skip to board</a>
      </nav>

      <header className="app-header">
        <div>
          <h1 id={APP_TITLE_ID} tabIndex={-1}>
            Notes Board
          </h1>
          <p className="readable-text">
            Your notes save automatically in this browser. Export them to keep a copy or move them elsewhere.
          </p>
        </div>
        <div className="button-row" role="group" aria-label="App tools">
          <button type="button" className="button" aria-disabled={!lastUndoStep} onClick={handleUndo}>
            Undo
            {lastUndoStep && <span className="visually-hidden">: {lastUndoStep.description}</span>}
          </button>
          <button type="button" className="button" onClick={() => setOpenDialog({ kind: 'settings' })}>
            Display settings
          </button>
          <button type="button" className="button" onClick={() => setOpenDialog({ kind: 'help' })}>
            Help
          </button>
        </div>
      </header>

      <p id={PICK_UP_INSTRUCTIONS_ID} hidden>
        After picking up, use the arrow keys to choose a column, Space to drop, and Esc to cancel.
      </p>

      <main>
        <div className="layout-container">
          <div className="layout">
            <div className="sidebar">
              <section className="panel" aria-labelledby={ADD_NOTE_HEADING_ID}>
                <h2 id={ADD_NOTE_HEADING_ID} tabIndex={-1}>
                  Add a note
                </h2>
                <NoteForm submitLabel="Add note" onSave={handleCreate} />
              </section>

              <NoteList
                notes={data.notes}
                columns={data.columns}
                draggingId={draggingId}
                held={held}
                actions={actions}
                onExport={handleExport}
                onImport={handleImport}
              />
            </div>

            <Board
              notes={data.notes}
              columns={data.columns}
              draggingId={draggingId}
              held={held}
              actions={actions}
              onDropNote={handleDropNote}
              onAddColumn={handleAddColumn}
            />
          </div>
        </div>

        <StatusBar
          message={message}
          onUndo={() => {
            // The status bar's Undo button goes away with this message.
            focusAfterRender.current = STATUS_DISMISS_ID;
            handleUndo();
          }}
          onDismiss={handleDismissMessage}
        />
      </main>

      {openDialog?.kind === 'edit' && (
        <EditNoteDialog
          note={openDialog.note}
          onSave={(draft) => handleEdit(openDialog.note, draft)}
          onClose={() => setOpenDialog(null)}
        />
      )}

      {openDialog?.kind === 'delete' && (
        <Dialog title="Delete note?" alert onClose={() => setOpenDialog(null)}>
          {({ describedBy }) => (
            <>
              <p id={describedBy}>"{openDialog.note.title}" will be deleted. You can undo this until you close this page.</p>
              <div className="button-row">
                <button type="button" className="button" data-autofocus onClick={() => setOpenDialog(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => handleDelete(openDialog.note, openDialog.location)}
                >
                  Delete note
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}

      {openDialog?.kind === 'import' && (
        <Dialog title="Replace notes?" alert onClose={() => setOpenDialog(null)}>
          {({ describedBy }) => (
            <>
              <p id={describedBy}>
                {openDialog.fileName} has different versions of {formatCount(openDialog.replacedCount, 'note')} you already
                have. Importing will replace {openDialog.replacedCount === 1 ? 'it' : 'them'}. Your other notes are kept.
              </p>
              <div className="button-row">
                <button type="button" className="button" data-autofocus onClick={() => setOpenDialog(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => {
                    setOpenDialog(null);
                    applyImport(openDialog.incoming, openDialog.fileName);
                  }}
                >
                  Import and replace
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}

      {openDialog?.kind === 'settings' && (
        <Dialog title="Display settings" onClose={() => setOpenDialog(null)}>
          {() => (
            <DisplaySettings
              preferences={preferences}
              onChange={handleChangePreferences}
              onClose={() => setOpenDialog(null)}
            />
          )}
        </Dialog>
      )}

      {openDialog?.kind === 'help' && (
        <Dialog title="Help" onClose={() => setOpenDialog(null)}>
          {() => <HelpContent onClose={() => setOpenDialog(null)} />}
        </Dialog>
      )}
    </>
  );
}

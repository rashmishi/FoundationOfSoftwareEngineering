import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { Board, BOARD_HEADING_ID, columnMenuId, type ColumnActions } from './components/Board';
import { Dialog } from './components/Dialog';
import { DisplaySettings } from './components/DisplaySettings';
import { EditNoteDialog } from './components/EditNoteDialog';
import { HelpContent } from './components/HelpContent';
import { MoonIcon } from './components/icons';
import {
  moreButtonId,
  moveButtonId,
  pickUpButtonId,
  PICK_UP_INSTRUCTIONS_ID,
  type NoteActions,
} from './components/NoteCard';
import { NoteForm } from './components/NoteForm';
import { NoteList, NOTES_HEADING_ID } from './components/NoteList';
import { StatusBar, STATUS_DISMISS_ID, type Message } from './components/StatusBar';
import { todayIso } from './dates';
import { formatCount } from './format';
import {
  addColumn,
  addNote,
  deleteColumn,
  deleteNote,
  isColumnNameTaken,
  moveColumn,
  moveNote,
  notesInColumn,
  renameColumn,
  updateNote,
} from './notes';
import {
  applyPreferences,
  loadPreferences,
  messageTimeout,
  onDeviceSettingsChange,
  readDeviceSettings,
  resolveTheme,
  savePreferences,
  type Preferences,
} from './preferences';
import { playSound } from './sounds';
import { loadCollapsed, loadData, onExternalChange, saveCollapsed, saveData } from './storage';
import { countReplacedNotes, InvalidDataError, MAX_IMPORT_BYTES, mergeImport, parseImport, serializeExport } from './transfer';
import type { BoardData, Column, HeldNote, Note, NoteDraft, NoteLocation, ReorderTarget } from './types';

const APP_TITLE_ID = 'app-title';
const ADD_NOTE_HEADING_ID = 'add-note-heading';
const MAX_UNDO_STEPS = 20;

type OpenDialog =
  | { kind: 'edit'; note: Note }
  | { kind: 'delete'; note: Note; location: NoteLocation }
  | { kind: 'delete-column'; column: Column }
  | { kind: 'import'; incoming: BoardData; fileName: string; replacedCount: number }
  | { kind: 'settings' }
  | { kind: 'help' };

interface UndoStep {
  data: BoardData;
  description: string;
}

/** Animates a change to the board with the browser's view transitions, when animation is on. */
function withMotion(update: () => void) {
  if (document.documentElement.dataset.motion === 'full' && document.startViewTransition) {
    document.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
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
  const [collapsedIds, setCollapsedIds] = useState(loadCollapsed);
  // Re-renders when the device's colour, contrast or motion settings change.
  const deviceSettings = useSyncExternalStore(onDeviceSettingsChange, readDeviceSettings);
  const focusAfterRender = useRef<string | null>(null);
  const lastUndoStep = undoSteps.at(-1);
  const today = todayIso();
  const isDark = resolveTheme(preferences.theme) !== 'light';

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
  }, [preferences, deviceSettings]);

  function notify(kind: Message['kind'], text: string, undoable = false) {
    setMessage((previous) => ({ kind, text, undoable, sequence: (previous?.sequence ?? 0) + 1 }));
    playSound(kind);
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

  function handleRename(note: Note, title: string): string | null {
    const trimmed = title.trim();
    if (!trimmed) return 'Enter a title for the note.';
    if (trimmed === note.title) return null;
    const saved = applyChange(updateNote(data, note.id, { ...note, title: trimmed }), `Renamed "${note.title}" to "${trimmed}".`);
    return saved ? null : 'The new title was not saved. Try again.';
  }

  function handleDelete(note: Note, location: NoteLocation) {
    setOpenDialog(null);
    focusAfterRender.current = location === 'board' ? BOARD_HEADING_ID : NOTES_HEADING_ID;
    applyChange(deleteNote(data, note.id), `Note "${note.title}" deleted.`);
  }

  /**
   * Puts a note in a column, at a position among its other notes, or at the end.
   * Moving a card remounts it, so focusId names the control to focus afterwards.
   */
  function placeNote(note: Note, columnId: string | null, index?: number, focusId?: string) {
    const columnNotes = notesInColumn(data, columnId);
    const currentIndex = columnNotes.findIndex((candidate) => candidate.id === note.id);
    const otherCount = columnNotes.length - (currentIndex >= 0 ? 1 : 0);
    const isSameColumn = note.columnId === columnId;

    if (isSameColumn && (columnId === null || index === undefined || index === currentIndex)) {
      notify('info', `"${note.title}" is already ${columnId ? `there in ${columnName(columnId)}` : 'off the board'}.`);
      return;
    }
    const description = !columnId
      ? `Removed "${note.title}" from the board.`
      : isSameColumn
        ? `Moved "${note.title}" to position ${(index ?? otherCount) + 1} of ${otherCount + 1} in ${columnName(columnId)}.`
        : `Moved "${note.title}" to ${columnName(columnId)}.`;
    // The focus target is set inside the update. Set earlier, a render in between could use it up.
    withMotion(() => {
      if (focusId) focusAfterRender.current = focusId;
      applyChange(moveNote(data, note.id, columnId, index), description);
    });
  }

  function handleReorder(note: Note, target: ReorderTarget) {
    const columnNotes = notesInColumn(data, note.columnId);
    const current = columnNotes.findIndex((candidate) => candidate.id === note.id);
    const index = { up: current - 1, down: current + 1, top: 0, bottom: columnNotes.length - 1 }[target];
    placeNote(note, note.columnId, index, moreButtonId('board', note.id));
  }

  function handlePickUpOrDrop(note: Note, location: NoteLocation) {
    if (held?.noteId === note.id && held.location === location) {
      setHeld(null);
      const focusId = location === 'board' ? pickUpButtonId('board', note.id) : undefined;
      placeNote(note, held.targetColumnId, held.targetIndex ?? undefined, focusId);
    } else {
      const index = notesInColumn(data, note.columnId).findIndex((candidate) => candidate.id === note.id);
      setHeld({ noteId: note.id, location, targetColumnId: note.columnId, targetIndex: index >= 0 ? index : null });
      notify(
        'info',
        `Picked up "${note.title}". Press Left or Right to choose a column, Up or Down to choose a place, Space to drop, or Esc to cancel.`,
      );
    }
  }

  function handleHeldColumnStep(step: number) {
    if (!held) return;
    const currentIndex = data.columns.findIndex((column) => column.id === held.targetColumnId);
    const index = Math.min(Math.max(currentIndex + step, 0), data.columns.length - 1);
    const column = data.columns[index];
    const columnNotes = notesInColumn(data, column.id);
    const ownIndex = columnNotes.findIndex((note) => note.id === held.noteId);
    // Back in its own column, the note returns to its own place. Elsewhere it goes last.
    const targetIndex = ownIndex >= 0 ? ownIndex : columnNotes.length;
    setHeld({ ...held, targetColumnId: column.id, targetIndex });
    notify('info', `Over ${column.name}, column ${index + 1} of ${data.columns.length}. Press Space to drop here.`);
  }

  function handleHeldPositionStep(step: number) {
    if (!held) return;
    if (!held.targetColumnId) {
      notify('info', 'Choose a column first, with the Left and Right arrow keys.');
      return;
    }
    const others = notesInColumn(data, held.targetColumnId).filter((note) => note.id !== held.noteId);
    const targetIndex = Math.min(Math.max((held.targetIndex ?? others.length) + step, 0), others.length);
    setHeld({ ...held, targetIndex });
    notify('info', `Position ${targetIndex + 1} of ${others.length + 1} in ${columnName(held.targetColumnId)}.`);
  }

  function handleHeldCancel() {
    setHeld(null);
    notify('info', 'Note put back. Nothing has moved.');
  }

  function checkColumnName(name: string, exceptId?: string): string | null {
    if (!name) return 'Enter a name for the column.';
    if (isColumnNameTaken(data, name, exceptId)) return `There is already a column called "${name}". Enter a different name.`;
    return null;
  }

  const columnActions: ColumnActions = {
    onAdd: (name) => {
      const trimmed = name.trim();
      const problem = checkColumnName(trimmed);
      if (problem) return problem;
      return applyChange(addColumn(data, trimmed), `Column "${trimmed}" added.`) ? null : 'The column was not saved. Try again.';
    },
    onRename: (column, name) => {
      const trimmed = name.trim();
      if (trimmed === column.name) return null;
      const problem = checkColumnName(trimmed, column.id);
      if (problem) return problem;
      const saved = applyChange(renameColumn(data, column.id, trimmed), `Renamed column "${column.name}" to "${trimmed}".`);
      return saved ? null : 'The new name was not saved. Try again.';
    },
    onMove: (column, step) => {
      withMotion(() => {
        focusAfterRender.current = columnMenuId(column.id);
        applyChange(moveColumn(data, column.id, step), `Moved column "${column.name}" ${step < 0 ? 'left' : 'right'}.`);
      });
    },
    onDelete: (column) => setOpenDialog({ kind: 'delete-column', column }),
    onToggleCollapsed: (columnId) => {
      const next = new Set(collapsedIds);
      if (!next.delete(columnId)) next.add(columnId);
      setCollapsedIds(next);
      saveCollapsed(next);
    },
    onDropNote: (noteId, columnId, index) => {
      const note = data.notes.find((candidate) => candidate.id === noteId);
      if (note) placeNote(note, columnId, index);
    },
  };

  function handleDeleteColumn(column: Column) {
    setOpenDialog(null);
    focusAfterRender.current = BOARD_HEADING_ID;
    const count = notesInColumn(data, column.id).length;
    const notesText = count > 0 ? ` ${formatCount(count, 'note')} taken off the board.` : '';
    applyChange(deleteColumn(data, column.id), `Column "${column.name}" deleted.${notesText}`);
  }

  function handleExport() {
    const blob = new Blob([serializeExport(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes-board-${today}.json`;
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
      const focusId = location === 'board' ? moveButtonId(columnId ? 'board' : 'list', note.id) : undefined;
      placeNote(note, columnId, undefined, focusId);
    },
    onRename: handleRename,
    onReorder: handleReorder,
    onDragStart: setDraggingId,
    onDragEnd: () => setDraggingId(null),
    onPickUpOrDrop: handlePickUpOrDrop,
    onHeldColumnStep: handleHeldColumnStep,
    onHeldPositionStep: handleHeldPositionStep,
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
          <button
            type="button"
            className="button button-with-icon"
            aria-pressed={isDark}
            onClick={() => handleChangePreferences({ ...preferences, theme: isDark ? 'light' : 'dark' })}
          >
            <MoonIcon />
            Dark mode
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
        After picking up, use Left and Right to choose a column, Up and Down to choose a place, Space to drop, and Esc to
        cancel.
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
                today={today}
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
              collapsedIds={collapsedIds}
              today={today}
              draggingId={draggingId}
              held={held}
              actions={actions}
              columnActions={columnActions}
            />
          </div>
        </div>

        <StatusBar
          message={message}
          timeoutMs={messageTimeout(preferences)}
          onUndo={() => {
            // The status bar's Undo button goes away with this message.
            focusAfterRender.current = STATUS_DISMISS_ID;
            handleUndo();
          }}
          onDismiss={handleDismissMessage}
          onTimeout={() => setMessage(null)}
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

      {openDialog?.kind === 'delete-column' && (
        <Dialog title="Delete column?" alert onClose={() => setOpenDialog(null)}>
          {({ describedBy }) => {
            const count = notesInColumn(data, openDialog.column.id).length;
            return (
              <>
                <p id={describedBy}>
                  The column "{openDialog.column.name}" will be deleted.
                  {count > 0 && ` Its ${formatCount(count, 'note')} will be taken off the board, not deleted.`} You can
                  undo this until you close this page.
                </p>
                <div className="button-row">
                  <button type="button" className="button" data-autofocus onClick={() => setOpenDialog(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() => handleDeleteColumn(openDialog.column)}
                  >
                    Delete column
                  </button>
                </div>
              </>
            );
          }}
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

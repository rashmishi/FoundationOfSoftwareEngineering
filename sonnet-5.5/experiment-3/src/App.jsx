import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Board from './components/Board.jsx';
import Icon from './components/Icons.jsx';
import Modal, { ConfirmDialog } from './components/Modal.jsx';
import NoteFields, { checkDraft, draftFromNote, focusTitle } from './components/NoteFields.jsx';
import NotesPanel, { emptyFilters } from './components/NotesPanel.jsx';
import Toasts from './components/Toasts.jsx';
import { PREFS_KEY, STORAGE_KEY, loadJSON, playSound, saveJSON, todayISO } from './lib/helpers.js';
import { exportJSON, importJSON } from './lib/importExport.js';
import { createNote, reducer, sanitizeState } from './state/reducer.js';

function EditDialog({ note, onSave, onClose }) {
  const [draft, setDraft] = useState(draftFromNote(note));
  const [errors, setErrors] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const { errors: found, values } = checkDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) focusTitle('edit');
    else onSave(note.id, values);
  };
  return (
    <Modal title="Edit note" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <NoteFields idPrefix="edit" draft={draft} errors={errors} onChange={setDraft} />
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

const MAX_HISTORY = 20;

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, () => sanitizeState(loadJSON(STORAGE_KEY, null)));
  const [prefs, setPrefs] = useState(() => ({ theme: document.documentElement.dataset.theme || 'light', sound: true, ...loadJSON(PREFS_KEY, {}) }));
  const [filters, setFilters] = useState(emptyFilters);
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInput = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const historyRef = useRef(history);
  historyRef.current = history;
  const pendingFocus = useRef(null);
  const toastId = useRef(0);

  useEffect(() => saveJSON(STORAGE_KEY, state), [state]);
  useEffect(() => {
    saveJSON(PREFS_KEY, prefs);
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs]);

  // After a menu action moves or removes a card, put keyboard focus somewhere sensible instead of losing it.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    let el = null;
    if (target.note) {
      el =
        document.querySelector(`.column [data-note-id="${target.note}"] .menu-trigger`) ||
        document.querySelector(`[data-note-id="${target.note}"] .menu-trigger`);
    }
    (el || document.getElementById('main'))?.focus();
  });

  const sound = useCallback((kind) => playSound(kind, prefs.sound), [prefs.sound]);

  const toast = useCallback((message, kind = 'success', undo = null) => {
    setToasts((list) => [...list.slice(-3), { id: ++toastId.current, message, kind, undo }]);
  }, []);
  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const restore = useCallback(
    (snapshot, message) => {
      dispatch({ type: 'RESTORE', state: snapshot });
      setHistory((h) => {
        const at = h.lastIndexOf(snapshot);
        return at >= 0 ? h.slice(0, at) : h;
      });
      toast(message);
      sound('undo');
    },
    [toast, sound],
  );
  const undoToast = useCallback(
    (t) => {
      dismissToast(t.id);
      restore(t.undo, `Undone: ${t.message}`);
    },
    [dismissToast, restore],
  );
  const undoLast = useCallback(() => {
    const last = historyRef.current[historyRef.current.length - 1];
    if (last) restore(last, 'Undid the last action.');
  }, [restore]);

  // Ctrl+Z (Cmd+Z on a Mac) undoes the last action unless the person is typing or a dialog is open.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      if (document.querySelector('dialog[open]')) return;
      e.preventDefault();
      undoLast();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undoLast]);

  /** Applies an action and offers an Undo that puts the previous state back. */
  const run = (action, message, soundName = 'add') => {
    const before = stateRef.current;
    dispatch(action);
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), before]);
    toast(message, 'success', before);
    sound(soundName);
  };
  const fail = (message) => {
    toast(message, 'error');
    sound('error');
  };

  const notesById = Object.fromEntries(state.notes.map((n) => [n.id, n]));

  const onCreate = (values) => {
    if (!values) return fail('The note was not saved. Enter a title and try again.');
    run({ type: 'ADD_NOTE', note: createNote(values) }, `Note "${values.title}" was created.`);
  };

  const onRenameNote = (id, title) => {
    if (!title.trim()) return fail('A note needs a title, so the old title was kept.');
    run({ type: 'UPDATE_NOTE', id, changes: { title: title.trim() } }, 'Title updated.', 'drop');
  };

  const onMove = (id, columnId) => {
    const name = state.columns.find((c) => c.id === columnId)?.name;
    pendingFocus.current = { note: id };
    run({ type: 'MOVE_NOTE', id, columnId }, columnId ? `Moved "${notesById[id].title}" to ${name}.` : `Removed "${notesById[id].title}" from the board.`, 'drop');
  };

  /** Moves a board card to a new position (0-based) in its own column, without dragging. */
  const onReorder = (id, position) => {
    const column = state.columns.find((c) => c.noteIds.includes(id));
    if (!column) return;
    const from = column.noteIds.indexOf(id);
    pendingFocus.current = { note: id };
    run(
      { type: 'MOVE_NOTE', id, columnId: column.id, index: position > from ? position + 1 : position },
      `Moved "${notesById[id].title}" to position ${position + 1} of ${column.noteIds.length} in ${column.name}.`,
      'drop',
    );
  };

  const onDropNote = (id, columnId, index) => {
    setDragging(null);
    setDropTarget(null);
    if (!id || !notesById[id]) return;
    const name = state.columns.find((c) => c.id === columnId)?.name;
    run({ type: 'MOVE_NOTE', id, columnId, index }, `"${notesById[id].title}" is now in ${name}.`, 'drop');
  };

  const confirmDelete = () => {
    const target = pendingDelete;
    setPendingDelete(null);
    pendingFocus.current = {};
    if (target.kind === 'note') run({ type: 'DELETE_NOTE', id: target.id }, `Note "${notesById[target.id].title}" was deleted.`, 'delete');
    else run({ type: 'DELETE_COLUMN', id: target.id }, `Column "${state.columns.find((c) => c.id === target.id).name}" was deleted.`, 'delete');
  };

  const shared = {
    columns: state.columns,
    dragging,
    onDragStart: (e, id) => {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      setDragging(id);
    },
    onDragEnd: () => {
      setDragging(null);
      setDropTarget(null);
    },
    onEdit: setEditingId,
    onDelete: (id) => setPendingDelete({ kind: 'note', id }),
    onRenameNote,
    onMove,
    onReorder,
  };

  const exportNotes = () => {
    const blob = new Blob([exportJSON(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes-${todayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(`Exported ${state.notes.length} ${state.notes.length === 1 ? 'note' : 'notes'}.`);
  };

  const importNotes = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const result = importJSON(await file.text(), stateRef.current);
    if (!result.ok) {
      setImportError(`Import failed: ${result.error}`);
      sound('error');
      return;
    }
    setImportError('');
    run({ type: 'REPLACE', state: result.state }, `Imported ${result.count} ${result.count === 1 ? 'note' : 'notes'}.`);
  };

  const editing = editingId && notesById[editingId];
  const dark = prefs.theme === 'dark';

  return (
    <div className="app">
      <header className="app-header">
        <h1>Notes Board</h1>
        <div className="header-actions">
          <button type="button" className="btn" onClick={undoLast} disabled={history.length === 0} aria-keyshortcuts="Control+Z Meta+Z">
            Undo
          </button>
          <button type="button" className="btn" onClick={exportNotes}>
            <Icon name="download" size={16} /> Export
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current.click()}>
            <Icon name="upload" size={16} /> Import
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importNotes} aria-label="Choose a JSON file to import" />
          <button type="button" className="icon-btn" aria-label="Sound effects" aria-pressed={prefs.sound} title={prefs.sound ? 'Sound effects on' : 'Sound effects off'} onClick={() => setPrefs({ ...prefs, sound: !prefs.sound })}>
            <Icon name={prefs.sound ? 'sound' : 'mute'} />
          </button>
          <button type="button" className="icon-btn" aria-label="Dark mode" aria-pressed={dark} title={dark ? 'Dark mode on' : 'Dark mode off'} onClick={() => setPrefs({ ...prefs, theme: dark ? 'light' : 'dark' })}>
            <Icon name={dark ? 'moon' : 'sun'} />
          </button>
        </div>
        <p id="rename-help" className="sr-label">
          Press Enter to save, Escape to cancel.
        </p>
      </header>

      {importError && (
        <div className="banner banner-error" role="alert">
          <span>{importError}</span>
          <button type="button" className="icon-btn" aria-label="Dismiss import error" onClick={() => setImportError('')}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      <main className="layout" id="main" tabIndex={-1}>
        <NotesPanel state={state} filters={filters} setFilters={setFilters} shared={shared} onCreate={onCreate} />
        <Board
          columns={state.columns}
          notesById={notesById}
          shared={shared}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
          onDropNote={onDropNote}
          onAddColumn={(name) => run({ type: 'ADD_COLUMN', name }, `Column "${name.trim()}" was added.`)}
          onToggle={(id) => dispatch({ type: 'TOGGLE_COLUMN', id })}
          onRenameColumn={(id, name) => (name.trim() ? run({ type: 'RENAME_COLUMN', id, name }, 'Column renamed.', 'drop') : fail('A column needs a name, so the old name was kept.'))}
          onDeleteColumn={(id) => setPendingDelete({ kind: 'column', id })}
        />
      </main>

      {editing && (
        <EditDialog
          note={editing}
          onClose={() => setEditingId(null)}
          onSave={(id, values) => {
            setEditingId(null);
            run({ type: 'UPDATE_NOTE', id, changes: values }, `Note "${values.title}" was updated.`, 'drop');
          }}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind === 'note' ? 'Delete note?' : 'Delete column?'}
          message={
            pendingDelete.kind === 'note'
              ? `"${notesById[pendingDelete.id]?.title}" will be removed from the list and the board. You can undo this afterwards.`
              : `The column "${state.columns.find((c) => c.id === pendingDelete.id)?.name}" will be removed. Its notes stay in the list.`
          }
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}

      <Toasts toasts={toasts} onDismiss={dismissToast} onUndo={undoToast} />
    </div>
  );
}

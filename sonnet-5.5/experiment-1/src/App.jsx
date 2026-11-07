import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppContext } from './context.js';
import {
  addColumn, addNote, clearColumn, duplicateNote, exportData, findNote, mergeImport, moveColumn, moveNote, notesInColumn,
  parseImport, removeColumn, removeNote, renameColumn, shiftNote, todayString, toggleCollapsed, toggleDone, updateNote,
  validateColumnName, validateNoteInput,
} from './lib/store.js';
import { DATA_STORAGE_KEY, loadPrefs, loadState, savePrefs, saveState } from './lib/storage.js';
import { playSound, setSoundEnabled } from './lib/sound.js';
import Board from './components/Board.jsx';
import FilterBar from './components/FilterBar.jsx';
import Header from './components/Header.jsx';
import { ConfirmModal } from './components/Modal.jsx';
import NoteForm from './components/NoteForm.jsx';
import NoteList from './components/NoteList.jsx';
import RenameColumnModal from './components/RenameColumnModal.jsx';
import Toasts, { useToasts } from './components/Toasts.jsx';

const NO_FILTERS = { q: '', priority: 'all', tag: 'all', overdue: false };
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const short = (s, n = 40) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const darkQuery = '(prefers-color-scheme: dark)';
const subscribeDark = (cb) => {
  const mq = window.matchMedia(darkQuery);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const systemPrefersDark = () => window.matchMedia(darkQuery).matches;

export default function App() {
  const [state, setState] = useState(loadState);
  const stateRef = useRef(state); // always the latest state, even between renders
  const [prefs, setPrefs] = useState(loadPrefs);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [modal, setModal] = useState(null);
  const [today, setToday] = useState(todayString);
  const { toasts, push, dismiss } = useToasts();
  const systemDark = useSyncExternalStore(subscribeDark, systemPrefersDark);
  const dark = prefs.theme ? prefs.theme === 'dark' : systemDark;

  // ----- preferences -----
  useEffect(() => {
    setSoundEnabled(prefs.sound);
    savePrefs(prefs);
    if (prefs.theme) document.documentElement.dataset.theme = prefs.theme;
    else delete document.documentElement.dataset.theme;
  }, [prefs]);

  // Overdue highlighting must roll over at midnight.
  useEffect(() => {
    const t = setInterval(() => setToday(todayString()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Follow edits made in another tab.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== DATA_STORAGE_KEY) return;
      const fresh = loadState();
      stateRef.current = fresh;
      setState(fresh);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ----- state changes -----
  const commit = useCallback(
    (next) => {
      stateRef.current = next;
      setState(next);
      if (!saveState(next)) {
        push({ kind: 'error', message: 'Your changes could not be saved: browser storage is full or blocked.' });
      }
    },
    [push],
  );

  /** Applies `next`, then shows a toast whose Undo puts the previous state back. */
  const act = (next, { message, sound, undoable = true }) => {
    const prev = stateRef.current;
    if (next === prev) return false;
    commit(next);
    push({
      message,
      undo: undoable
        ? () => {
            // Keep column collapse choices made since: they are view settings, not content.
            const now = stateRef.current;
            const columns = prev.columns.map((c) => ({ ...c, collapsed: now.columns.find((x) => x.id === c.id)?.collapsed ?? c.collapsed }));
            commit({ ...prev, columns });
            playSound('undo');
          }
        : null,
    });
    if (sound) playSound(sound);
    return true;
  };

  const fail = (message) => {
    push({ kind: 'error', message });
    playSound('error');
  };

  const actions = {
    // dialogs
    openCreate: (columnId = null) => setModal({ type: 'note', noteId: null, columnId }),
    openEdit: (id) => setModal({ type: 'note', noteId: id }),
    askDeleteNote: (id) => setModal({ type: 'deleteNote', id }),
    askDeleteColumn: (id) => setModal({ type: 'deleteColumn', id }),
    askRenameColumn: (id) => setModal({ type: 'renameColumn', id }),
    closeModal: () => setModal(null),

    // notes
    saveNote(values, id) {
      const errors = validateNoteInput(values);
      if (Object.keys(errors).length) {
        playSound('error');
        return errors; // the form shows them next to the fields
      }
      const title = values.title.trim();
      if (id) act(updateNote(stateRef.current, id, values), { message: `Note “${short(title)}” updated.`, sound: 'save' });
      else act(addNote(stateRef.current, values).state, { message: `Note “${short(title)}” created.`, sound: 'create' });
      setModal(null);
      return null;
    },
    renameNote(id, title) {
      const note = findNote(stateRef.current, id);
      if (!note) return;
      if (!title.trim()) return fail('A note needs a title, so the old title was kept.');
      const { description, tags, priority, dueDate } = note;
      act(updateNote(stateRef.current, id, { title, description, tags, priority, dueDate }), { message: `Title changed to “${short(title.trim())}”.`, sound: 'save' });
    },
    deleteNote(id) {
      const note = findNote(stateRef.current, id);
      setModal(null);
      if (note) act(removeNote(stateRef.current, id), { message: `Note “${short(note.title)}” deleted.`, sound: 'delete' });
    },
    duplicateNote(id) {
      const { state: next, note } = duplicateNote(stateRef.current, id);
      if (note) act(next, { message: `Duplicated as “${short(note.title)}”.`, sound: 'create' });
    },
    moveNote(id, columnId, beforeId) {
      const prev = stateRef.current;
      const note = findNote(prev, id);
      const next = moveNote(prev, id, columnId, beforeId);
      if (!note || next === prev) return;
      const col = prev.columns.find((c) => c.id === columnId);
      const message =
        columnId === null
          ? `Removed “${short(note.title)}” from the board.`
          : note.columnId === columnId
            ? `Reordered “${short(note.title)}” in ${col.name}.`
            : `Moved “${short(note.title)}” to ${col.name}.`;
      act(next, { message, sound: 'move' });
    },
    shiftNote(id, direction) {
      const prev = stateRef.current;
      const note = findNote(prev, id);
      if (note) act(shiftNote(prev, id, direction), { message: `Moved “${short(note.title)}” ${direction < 0 ? 'up' : 'down'}.`, sound: 'move' });
    },

    // columns
    addColumn(name) {
      const error = validateColumnName(name);
      if (error) {
        playSound('error');
        return error;
      }
      act(addColumn(stateRef.current, name).state, { message: `Column “${short(name.trim())}” added.`, sound: 'create' });
      return '';
    },
    renameColumn(id, name) {
      const error = validateColumnName(name);
      if (error) {
        playSound('error');
        return error;
      }
      act(renameColumn(stateRef.current, id, name), { message: `Column renamed to “${short(name.trim())}”.`, sound: 'save' });
      setModal(null);
      return '';
    },
    toggleCollapsed(id) {
      commit(toggleCollapsed(stateRef.current, id));
      playSound('toggle');
    },
    toggleDone(id) {
      const col = stateRef.current.columns.find((c) => c.id === id);
      act(toggleDone(stateRef.current, id), {
        message: col.done ? `Notes in “${short(col.name)}” can be overdue again.` : `“${short(col.name)}” is now a done column: its notes are never overdue.`,
        sound: 'save',
      });
    },
    moveColumn(id, direction) {
      const col = stateRef.current.columns.find((c) => c.id === id);
      act(moveColumn(stateRef.current, id, direction), { message: `Moved column “${short(col.name)}” ${direction < 0 ? 'left' : 'right'}.`, sound: 'move' });
    },
    clearColumn(id) {
      const n = notesInColumn(stateRef.current, id).length;
      act(clearColumn(stateRef.current, id), { message: `Took ${n} ${n === 1 ? 'note' : 'notes'} off the board. They are still in your list.`, sound: 'delete' });
    },
    deleteColumn(id) {
      const col = stateRef.current.columns.find((c) => c.id === id);
      setModal(null);
      if (col) act(removeColumn(stateRef.current, id), { message: `Column “${short(col.name)}” deleted. Its notes are still in your list.`, sound: 'delete' });
    },

    // filters
    setFilters,
    clearFilters: () => setFilters(NO_FILTERS),

    // files
    exportNotes() {
      const data = exportData(stateRef.current);
      const filename = `notes-kanban-${todayString()}.json`;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      push({ message: `Exported ${data.notes.length} ${data.notes.length === 1 ? 'note' : 'notes'} to ${filename}.` });
      playSound('save');
    },
    async importFile(file) {
      if (file.size > MAX_IMPORT_BYTES) return fail('Import failed: the file is larger than 5 MB. No notes were changed.');
      let text;
      try {
        text = await file.text();
      } catch {
        return fail('Import failed: the file could not be read. No notes were changed.');
      }
      const parsed = parseImport(text);
      if (!parsed.ok) return fail(`Import failed: ${parsed.error} No notes were changed.`);
      if (parsed.data.notes.length === 0) {
        push({ kind: 'info', message: 'The file is valid but contains no notes.' });
        return;
      }
      const { state: next, added, updated } = mergeImport(stateRef.current, parsed.data);
      const total = added + updated;
      const detail = updated ? ` (${added} new, ${updated} updated)` : '';
      act(next, { message: `Imported ${total} ${total === 1 ? 'note' : 'notes'}${detail}.`, sound: 'create' });
    },

    // preferences
    toggleSound() {
      const sound = !prefs.sound;
      setPrefs({ ...prefs, sound });
      setSoundEnabled(sound); // so the confirming blip below is heard (or not) immediately
      playSound('toggle');
    },
    toggleTheme: () => setPrefs({ ...prefs, theme: dark ? 'light' : 'dark' }),
  };

  // ----- drag and drop -----
  // dataTransfer contents cannot be read while dragging over a target, so the
  // dragged note and the current drop position are tracked here.
  const dragRef = useRef({ id: null, over: null });
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const drag = {
    dragId,
    over,
    start(id) {
      dragRef.current = { id, over: null };
      // Deferred so the browser snapshots the card before it gets its "dragging" look.
      setTimeout(() => dragRef.current.id === id && setDragId(id), 0);
    },
    end() {
      dragRef.current = { id: null, over: null };
      setDragId(null);
      setOver(null);
    },
    setOver(columnId, beforeId) {
      const cur = dragRef.current.over;
      if (cur && cur.columnId === columnId && cur.beforeId === beforeId) return;
      dragRef.current.over = { columnId, beforeId };
      setOver({ columnId, beforeId });
    },
    leave(columnId) {
      if (dragRef.current.over?.columnId !== columnId) return;
      dragRef.current.over = null;
      setOver(null);
    },
    drop(columnId) {
      const { id, over: o } = dragRef.current;
      if (id) actions.moveNote(id, columnId, o && o.columnId === columnId ? o.beforeId : null);
      drag.end();
    },
  };

  // ----- render -----
  const editing = modal?.type === 'note' && modal.noteId ? findNote(state, modal.noteId) : null;
  const delNote = modal?.type === 'deleteNote' ? findNote(state, modal.id) : null;
  const delCol = modal?.type === 'deleteColumn' ? state.columns.find((c) => c.id === modal.id) : null;
  const renCol = modal?.type === 'renameColumn' ? state.columns.find((c) => c.id === modal.id) : null;

  return (
    <AppContext.Provider value={{ state, today, filters, actions, drag }}>
      <div className={'app' + (dragId ? ' is-dragging' : '')}>
        <a className="skip-link" href="#main">
          Skip to notes and board
        </a>
        <Header actions={actions} dark={dark} soundOn={prefs.sound} />
        <FilterBar />
        <main id="main" className="layout" tabIndex={-1}>
          <NoteList />
          <Board />
        </main>

        {modal?.type === 'note' && (modal.noteId ? editing : true) && (
          <NoteForm
            key={modal.noteId ?? 'new'}
            note={editing}
            initialColumnId={modal.columnId}
            onSave={(values) => actions.saveNote(values, modal.noteId)}
            onClose={actions.closeModal}
          />
        )}
        {delNote && (
          <ConfirmModal title="Delete this note?" confirmLabel="Delete note" danger onConfirm={() => actions.deleteNote(delNote.id)} onClose={actions.closeModal}>
            <p>
              “<strong>{delNote.title}</strong>” will be removed from your list and the board. You can undo this right after.
            </p>
          </ConfirmModal>
        )}
        {delCol && (
          <ConfirmModal title="Delete this column?" confirmLabel="Delete column" danger onConfirm={() => actions.deleteColumn(delCol.id)} onClose={actions.closeModal}>
            <p>
              “<strong>{delCol.name}</strong>” will be removed from the board.
              {notesInColumn(state, delCol.id).length > 0 && ' Its notes are not deleted: they stay in your list.'}
            </p>
          </ConfirmModal>
        )}
        {renCol && <RenameColumnModal column={renCol} onSave={(name) => actions.renameColumn(renCol.id, name)} onClose={actions.closeModal} />}

        <Toasts toasts={toasts} onDismiss={dismiss} />
      </div>
    </AppContext.Provider>
  );
}

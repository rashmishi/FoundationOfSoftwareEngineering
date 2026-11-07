import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { columnOf, reducer } from './reducer.js';
import { DATA_KEY, loadState, saveState } from './storage.js';
import { normalizeData } from './importExport.js';
import { useToasts } from './toasts.jsx';
import { newId } from '../lib/ids.js';
import { playSound } from '../lib/sound.js';

const BoardContext = createContext(null);
const MAX_HISTORY = 30;

/**
 * The board state wrapped with an undo history:
 *   present  the current board
 *   past     earlier boards, newest last, each with the label of the change that replaced it
 */
function historyReducer(root, a) {
  switch (a.type) {
    case 'apply': {
      const next = reducer(root.present, a.action);
      if (next === root.present) return root;
      if (!a.historyId) return { ...root, present: next };
      const entry = { id: a.historyId, label: a.label, state: root.present };
      return { present: next, past: [...root.past, entry].slice(-MAX_HISTORY) };
    }
    case 'undo': {
      const last = root.past[root.past.length - 1];
      return last ? { present: last.state, past: root.past.slice(0, -1) } : root;
    }
    case 'external':
      return { ...root, present: a.state };
    default:
      return root;
  }
}

const short = (text, max = 40) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const quote = (text) => `“${short(text)}”`;

export function BoardProvider({ children }) {
  const { notify } = useToasts();
  const [root, dispatch] = useReducer(historyReducer, undefined, () => ({ present: loadState(), past: [] }));
  const [saveFailed, setSaveFailed] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);

  const droppedRef = useRef(false);
  const rootRef = useRef(root);
  const stateRef = useRef(root.present);
  rootRef.current = root;
  stateRef.current = root.present;
  const seq = useRef(0);

  // Save every change. If the browser refuses (private mode, full storage) say so instead of failing silently.
  useEffect(() => {
    setSaveFailed(!saveState(root.present));
  }, [root.present]);

  // Pick up changes made in another tab of the same browser.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== DATA_KEY || !e.newValue) return;
      try {
        const result = normalizeData(JSON.parse(e.newValue), { strict: false });
        if (result.ok && JSON.stringify(stateRef.current) !== e.newValue) dispatch({ type: 'external', state: result.data });
      } catch {
        /* ignore unreadable data from another tab */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** Applies a reducer action. Undoable actions pass a label. Returns the history id (or null if nothing changed). */
  const commit = useCallback((action, label) => {
    const before = stateRef.current;
    const after = reducer(before, action);
    if (after === before) return null;
    const historyId = label ? ++seq.current : 0;
    dispatch({ type: 'apply', action, label, historyId });
    stateRef.current = after;
    return historyId || -1;
  }, []);

  const requestFocus = useCallback((key) => setFocusRequest({ key, n: ++seq.current }), []);
  const clearFocusRequest = useCallback((n) => setFocusRequest((cur) => (cur && cur.n === n ? null : cur)), []);

  const actions = useMemo(() => {
    const find = (id) => stateRef.current.notes.find((n) => n.id === id);
    const columnName = (id) => stateRef.current.columns.find((c) => c.id === id)?.name ?? '';
    const ok = (message, historyId, sound) => {
      notify(message, { kind: 'success', undoId: historyId > 0 ? historyId : null });
      if (sound) playSound(sound);
    };

    return {
      createNote(values) {
        const now = new Date().toISOString();
        const note = {
          id: newId('note'),
          title: values.title.trim(),
          description: values.description.trim(),
          tags: values.tags,
          priority: values.priority,
          dueDate: values.dueDate,
          createdAt: now,
          updatedAt: now,
        };
        const columnId = values.columnId || null;
        const hid = commit({ type: 'note/add', note, columnId }, `create note ${quote(note.title)}`);
        const where = columnId ? ` and added to the “${short(columnName(columnId), 30)}” column` : '';
        ok(`Note ${quote(note.title)} created${where}.`, hid, 'add');
        return note;
      },

      updateNote(id, values) {
        const changes = {
          title: values.title.trim(),
          description: values.description.trim(),
          tags: values.tags,
          priority: values.priority,
          dueDate: values.dueDate,
          updatedAt: new Date().toISOString(),
        };
        const hid = commit({ type: 'note/update', id, changes, columnId: values.columnId || null }, `edit note ${quote(changes.title)}`);
        if (hid) ok(`Note ${quote(changes.title)} saved.`, hid, 'add');
        else notify('No changes to save.', { kind: 'info' });
      },

      renameNote(id, title) {
        const clean = title.trim();
        const hid = commit({ type: 'note/update', id, changes: { title: clean, updatedAt: new Date().toISOString() } }, `rename note to ${quote(clean)}`);
        if (hid) ok(`Title changed to ${quote(clean)}.`, hid, 'add');
      },

      deleteNote(id) {
        const note = find(id);
        if (!note) return;
        const hid = commit({ type: 'note/delete', id }, `delete note ${quote(note.title)}`);
        ok(`Note ${quote(note.title)} deleted.`, hid, 'delete');
      },

      /** Move to a column (columnId null = take off the board), optionally before another note. */
      moveNote(id, columnId, beforeId = null) {
        const note = find(id);
        if (!note) return false;
        const hid = commit({ type: 'note/move', id, columnId, beforeId }, `move note ${quote(note.title)}`);
        if (!hid) return false;
        if (!columnId) {
          ok(`Note ${quote(note.title)} removed from the board. It is still in your notes list.`, hid, 'move');
        } else {
          const col = stateRef.current.columns.find((c) => c.id === columnId);
          const pos = col.noteIds.indexOf(id) + 1;
          ok(`Note ${quote(note.title)} moved to the “${short(col.name, 30)}” column, position ${pos} of ${col.noteIds.length}.`, hid, 'move');
        }
        return true;
      },

      stepNote(id, delta) {
        const note = find(id);
        const hid = note && commit({ type: 'note/step', id, delta }, `reorder note ${quote(note.title)}`);
        if (!hid) return false;
        const col = columnOf(stateRef.current, id);
        ok(`Note ${quote(note.title)} moved ${delta < 0 ? 'up' : 'down'}: position ${col.noteIds.indexOf(id) + 1} of ${col.noteIds.length} in “${short(col.name, 30)}”.`, hid, 'move');
        return true;
      },

      addColumn(name) {
        const clean = name.trim();
        const hid = commit({ type: 'column/add', id: newId('col'), name: clean }, `add column ${quote(clean)}`);
        ok(`Column ${quote(clean)} added to the board.`, hid, 'add');
      },

      renameColumn(id, name) {
        const clean = name.trim();
        const hid = commit({ type: 'column/rename', id, name: clean }, `rename column to ${quote(clean)}`);
        if (hid) ok(`Column renamed to ${quote(clean)}.`, hid, 'add');
      },

      deleteColumn(id) {
        const col = stateRef.current.columns.find((c) => c.id === id);
        if (!col) return;
        const hid = commit({ type: 'column/delete', id }, `delete column ${quote(col.name)}`);
        ok(`Column ${quote(col.name)} deleted. Its ${col.noteIds.length} ${col.noteIds.length === 1 ? 'note is' : 'notes are'} still in your notes list.`, hid, 'delete');
      },

      moveColumn(id, delta) {
        const col = stateRef.current.columns.find((c) => c.id === id);
        const hid = col && commit({ type: 'column/move', id, delta }, `move column ${quote(col.name)}`);
        if (!hid) return false;
        const index = stateRef.current.columns.findIndex((c) => c.id === id) + 1;
        ok(`Column ${quote(col.name)} moved ${delta < 0 ? 'left' : 'right'}: position ${index} of ${stateRef.current.columns.length}.`, hid, 'move');
        return true;
      },

      toggleColumn(id) {
        commit({ type: 'column/toggle', id }, null);
        playSound('pick');
      },

      importData(data) {
        const existing = new Set(stateRef.current.notes.map((n) => n.id));
        const updated = data.notes.filter((n) => existing.has(n.id)).length;
        const added = data.notes.length - updated;
        const hid = commit({ type: 'import', data }, `import ${data.notes.length} ${data.notes.length === 1 ? 'note' : 'notes'}`);
        const parts = [];
        if (added) parts.push(`${added} new`);
        if (updated) parts.push(`${updated} updated`);
        ok(`Imported ${data.notes.length} ${data.notes.length === 1 ? 'note' : 'notes'} (${parts.join(', ')}).`, hid, 'add');
      },

      undo() {
        const top = rootRef.current.past[rootRef.current.past.length - 1];
        if (!top) return;
        dispatch({ type: 'undo' });
        notify(`Undone: ${top.label}.`, { kind: 'info' });
        playSound('undo');
      },
    };
  }, [commit, notify]);

  const top = root.past[root.past.length - 1] || null;
  const value = useMemo(
    () => ({
      state: root.present,
      actions,
      undoTopId: top ? top.id : null,
      undoLabel: top ? top.label : '',
      saveFailed,
      dragging,
      startDrag: (id) => {
        droppedRef.current = false;
        setDragging({ id });
      },
      endDrag: () => setDragging(null),
      // A column calls markDropped when it takes a drop, so the dragged card knows the drag did not end outside the columns.
      markDropped: () => {
        droppedRef.current = true;
      },
      wasDropped: () => droppedRef.current,
      focusRequest,
      requestFocus,
      clearFocusRequest,
    }),
    [root.present, actions, top, saveFailed, dragging, focusRequest, requestFocus, clearFocusRequest],
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  return useContext(BoardContext);
}

/** Focuses the element returned by `getTarget` when someone asked for focus on `key` (see requestFocus). */
export function useFocusRequest(key, getTarget) {
  const { focusRequest, clearFocusRequest } = useBoard();
  useEffect(() => {
    if (!focusRequest || focusRequest.key !== key) return;
    const el = getTarget();
    if (el) {
      el.focus();
      clearFocusRequest(focusRequest.n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest, key]);
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionsContext, type Actions } from './components/ActionsContext';
import { Board } from './components/Board';
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog';
import { EditNoteDialog } from './components/EditNoteDialog';
import { FilterBar } from './components/FilterBar';
import { Header } from './components/Header';
import { NoteForm } from './components/NoteForm';
import { NoteList } from './components/NoteList';
import { ToastProvider, useToast } from './components/Toasts';
import { useBoard } from './hooks/useBoard';
import { downloadText } from './lib/download';
import { applyTheme, loadSettings, saveSettings, type Settings } from './lib/settings';
import { playSound, setSoundEnabled } from './lib/sound';
import { notePosition } from './model/boardReducer';
import { todayISO } from './model/dates';
import { EMPTY_FILTERS, isFiltering, matchesFilters, type Filters } from './model/filter';
import {
  allTags,
  createColumn,
  createNote,
  isDoneColumn,
  newId,
  validateColumnName,
  validateDraft,
} from './model/notes';
import { exportFileName, MAX_IMPORT_BYTES, parseBoardFile, serialise } from './model/transfer';
import type { Column, NoteDraft } from './types';

export default function App() {
  return (
    <ToastProvider>
      <NotesApp />
    </ToastProvider>
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function NotesApp() {
  const notify = useToast();
  const { state, dispatch, loadError } = useBoard(() =>
    notify('Your changes could not be saved: browser storage is full or disabled.', { kind: 'error' }),
  );
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  // Commands read the latest state through a ref, so callbacks such as Undo never see stale data.
  const stateRef = useRef(state);
  stateRef.current = state;

  const today = todayISO();
  const filtering = isFiltering(filters);

  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.sound);
  }, [settings]);

  const reportedLoadError = useRef(false);
  useEffect(() => {
    if (loadError && !reportedLoadError.current) {
      reportedLoadError.current = true;
      notify(loadError, { kind: 'error' });
    }
  }, [loadError, notify]);

  const columnOfNote = useMemo(() => {
    const map = new Map<string, Column>();
    for (const column of state.columns) for (const id of column.noteIds) map.set(id, column);
    return map;
  }, [state.columns]);
  const columnOf = useCallback((id: string) => columnOfNote.get(id), [columnOfNote]);

  const noteTitle = (id: string) => stateRef.current.notes.find((n) => n.id === id)?.title ?? 'note';

  const undo = (action: Parameters<typeof dispatch>[0]) => () => {
    dispatch(action);
    playSound('undo');
  };

  // ---- Notes ----

  const createNoteCommand = (draft: NoteDraft): string | null => {
    const note = createNote(draft);
    dispatch({ type: 'addNote', note });
    playSound('create');
    notify(`Note “${note.title}” created.`);
    return null;
  };

  const saveEdit = (id: string, draft: NoteDraft) => {
    const before = stateRef.current.notes.find((n) => n.id === id);
    if (!before) return;
    const now = new Date().toISOString();
    dispatch({ type: 'updateNote', id, changes: draft, now });
    playSound('create');
    notify(`Note “${draft.title.trim()}” updated.`, {
      onUndo: undo({ type: 'updateNote', id, changes: before, now: before.updatedAt }),
    });
  };

  const actions: Actions = {
    columns: state.columns,
    today,
    query: filters.query,

    editNote: (id) => setEditingId(id),

    deleteNote: (id) => {
      const title = noteTitle(id);
      setConfirm({
        title: 'Delete note?',
        message: `“${title}” will be deleted. You can undo this from the notification that follows.`,
        confirmLabel: 'Delete note',
        onConfirm: () => {
          const current = stateRef.current;
          const listIndex = current.notes.findIndex((n) => n.id === id);
          if (listIndex === -1) return;
          const note = current.notes[listIndex];
          const { columnId, beforeId } = notePosition(current, id);
          dispatch({ type: 'deleteNote', id });
          playSound('delete');
          notify(`Note “${note.title}” deleted.`, {
            kind: 'info',
            onUndo: undo({ type: 'restoreNote', note, listIndex, columnId, beforeId }),
          });
        },
      });
    },

    renameNote: (id, title) => {
      const before = stateRef.current.notes.find((n) => n.id === id);
      if (!before) return null;
      const problem = validateDraft({ ...before, title });
      if (problem) {
        playSound('error');
        return problem;
      }
      dispatch({ type: 'updateNote', id, changes: { title }, now: new Date().toISOString() });
      playSound('toggle');
      notify(`Renamed to “${title.trim()}”.`, {
        onUndo: undo({ type: 'updateNote', id, changes: { title: before.title }, now: before.updatedAt }),
      });
      return null;
    },

    duplicateNote: (id) => {
      const copyId = newId();
      dispatch({ type: 'duplicateNote', id, newId: copyId, now: new Date().toISOString() });
      playSound('create');
      notify(`Duplicated “${noteTitle(id)}”.`, { onUndo: undo({ type: 'deleteNote', id: copyId }) });
    },

    moveNote: (id, columnId, beforeId) => {
      const current = stateRef.current;
      if (!current.notes.some((n) => n.id === id) || beforeId === id) return;
      const from = notePosition(current, id);
      if (from.columnId === columnId && (columnId === null || from.beforeId === beforeId)) return;
      dispatch({ type: 'moveNote', id, columnId, beforeId });
      playSound('drop');
      const target = current.columns.find((c) => c.id === columnId);
      const title = noteTitle(id);
      const message =
        target === undefined
          ? `Removed “${title}” from the board.`
          : from.columnId === columnId
            ? `Reordered “${title}” in ${target.name}.`
            : `Moved “${title}” to ${target.name}.`;
      notify(message, { onUndo: undo({ type: 'moveNote', id, columnId: from.columnId, beforeId: from.beforeId }) });
    },

    shiftNote: (id, offset) => {
      const column = stateRef.current.columns.find((c) => c.noteIds.includes(id));
      if (!column) return;
      const index = column.noteIds.indexOf(id);
      const target = index + offset;
      if (target < 0 || target >= column.noteIds.length) return;
      // Moving up: in front of the previous note. Moving down: in front of the note after the next one.
      const beforeId = offset === -1 ? column.noteIds[target] : (column.noteIds[index + 2] ?? null);
      dispatch({ type: 'moveNote', id, columnId: column.id, beforeId });
      playSound('drop');
    },

    // ---- Columns ----

    renameColumn: (id, name) => {
      const problem = validateColumnName(name, stateRef.current.columns, id);
      if (problem) {
        playSound('error');
        return problem;
      }
      dispatch({ type: 'renameColumn', id, name });
      playSound('toggle');
      return null;
    },

    toggleColumn: (id) => {
      dispatch({ type: 'toggleColumn', id });
      playSound('toggle');
    },

    moveColumn: (id, offset) => {
      dispatch({ type: 'moveColumn', id, offset });
      playSound('drop');
    },

    deleteColumn: (id) => {
      const column = stateRef.current.columns.find((c) => c.id === id);
      if (!column) return;
      const count = column.noteIds.length;
      setConfirm({
        title: 'Delete column?',
        message:
          count === 0
            ? `The column “${column.name}” will be deleted.`
            : `The column “${column.name}” will be deleted. Its ${plural(count, 'note')} will stay in the note list.`,
        confirmLabel: 'Delete column',
        onConfirm: () => {
          const current = stateRef.current;
          const index = current.columns.findIndex((c) => c.id === id);
          if (index === -1) return;
          const removed = current.columns[index];
          dispatch({ type: 'deleteColumn', id });
          playSound('delete');
          notify(`Column “${removed.name}” deleted.`, {
            kind: 'info',
            onUndo: undo({ type: 'restoreColumn', column: removed, index }),
          });
        },
      });
    },

    playPick: () => playSound('pick'),
  };

  const addColumn = (name: string): string | null => {
    const problem = validateColumnName(name, stateRef.current.columns);
    if (problem) {
      playSound('error');
      return problem;
    }
    const column = createColumn(name);
    dispatch({ type: 'addColumn', column });
    playSound('create');
    notify(`Column “${column.name}” added.`, { onUndo: undo({ type: 'deleteColumn', id: column.id }) });
    return null;
  };

  // ---- Import / export ----

  const exportNotes = () => {
    const current = stateRef.current;
    downloadText(exportFileName(), serialise(current));
    notify(`Exported ${plural(current.notes.length, 'note')}.`, { kind: 'info' });
  };

  const importNotes = async (file: File) => {
    const reject = (reason: string) => {
      playSound('error');
      notify(`Import failed: ${reason}`, { kind: 'error' });
    };
    if (file.size > MAX_IMPORT_BYTES) return reject('the file is larger than 5 MB.');
    let text: string;
    try {
      text = await file.text();
    } catch {
      return reject('the file could not be read.');
    }
    const previous = stateRef.current;
    const result = parseBoardFile(text, previous.columns);
    if (!result.ok) return reject(result.error);
    dispatch({ type: 'replace', state: result.state });
    setFilters(EMPTY_FILTERS);
    playSound('create');
    notify(
      `Imported ${plural(result.state.notes.length, 'note')} and ${plural(result.state.columns.length, 'column')} from ${file.name}.`,
      { onUndo: undo({ type: 'replace', state: previous }) },
    );
  };

  // ---- Settings ----

  const toggleTheme = () => {
    const theme = settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme, true);
    setSettings({ ...settings, theme });
    playSound('toggle');
  };

  const toggleSound = () => {
    const sound = !settings.sound;
    setSoundEnabled(sound);
    setSettings({ ...settings, sound });
    if (sound) playSound('toggle');
  };

  const visibleNotes = state.notes.filter((n) => matchesFilters(n, filters, today, isDoneColumn(columnOf(n.id))));
  const editingNote = state.notes.find((n) => n.id === editingId) ?? null;

  return (
    <ActionsContext.Provider value={actions}>
      <div className="app">
        <Header settings={settings} onToggleTheme={toggleTheme} onToggleSound={toggleSound} onExport={exportNotes} onImport={importNotes} />
        <FilterBar filters={filters} onChange={setFilters} tags={allTags(state.notes)} active={filtering} />
        <main className="layout">
          <aside className="sidebar">
            <NoteForm onCreate={createNoteCommand} />
            <NoteList notes={visibleNotes} total={state.notes.length} filtering={filtering} columnOf={columnOf} isDone={isDoneColumn} />
          </aside>
          <Board state={state} filters={filters} filtering={filtering} today={today} onAddColumn={addColumn} />
        </main>
      </div>
      <EditNoteDialog note={editingNote} onSave={saveEdit} onClose={() => setEditingId(null)} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </ActionsContext.Provider>
  );
}

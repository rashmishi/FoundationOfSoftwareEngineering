import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBoard } from './state/board.jsx';
import { UiContext } from './state/ui.jsx';
import { Header } from './components/Header.jsx';
import { FilterBar } from './components/FilterBar.jsx';
import { NoteForm } from './components/NoteForm.jsx';
import { NoteList } from './components/NoteList.jsx';
import { Board } from './components/Board.jsx';
import { Toasts } from './components/Toasts.jsx';
import { ConfirmDialog } from './components/Dialog.jsx';
import { EditNoteDialog } from './components/EditNoteDialog.jsx';
import { RenameColumnDialog } from './components/ColumnDialog.jsx';
import { HelpDialog, SettingsDialog } from './components/InfoDialogs.jsx';
import { Icon } from './components/Icon.jsx';
import { allTags, emptyFilters, isFiltering, matchesFilters } from './lib/filter.js';
import { todayISO } from './lib/dates.js';

const SKIP_LINKS = [
  ['search-notes', 'Skip to search and filters'],
  ['add-note-heading', 'Skip to the add note form'],
  ['notes-heading', 'Skip to the notes list'],
  ['board-heading', 'Skip to the board'],
];

function skipTo(e, id) {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  el.scrollIntoView({ block: 'start' });
}

const short = (text, max = 50) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export default function App() {
  const { state, actions, saveFailed, requestFocus } = useBoard();
  const [filters, setFilters] = useState(emptyFilters);
  // dialog: { type: 'edit' | 'deleteNote' | 'renameColumn' | 'deleteColumn' | 'help' | 'settings', id?, scope? }
  const [dialog, setDialog] = useState(null);

  const placement = useMemo(() => {
    const map = new Map();
    for (const c of state.columns) for (const id of c.noteIds) map.set(id, c.id);
    return map;
  }, [state.columns]);

  const tags = useMemo(() => allTags(state.notes), [state.notes]);
  const today = todayISO();
  const filtering = isFiltering(filters);

  // If a filter points at a tag or column that no longer exists, fall back to "any".
  useEffect(() => {
    setFilters((f) => {
      let next = f;
      if (f.tag !== 'any' && !tags.some((t) => t.toLowerCase() === f.tag.toLowerCase())) next = { ...next, tag: 'any' };
      if (f.column !== 'any' && f.column !== 'none' && !state.columns.some((c) => c.id === f.column)) next = { ...next, column: 'any' };
      return next;
    });
  }, [tags, state.columns]);

  const visibleNotes = useMemo(
    () => state.notes.filter((n) => matchesFilters(n, placement.get(n.id) || null, filters, today)),
    [state.notes, placement, filters, today],
  );
  const visibleIds = useMemo(() => new Set(visibleNotes.map((n) => n.id)), [visibleNotes]);

  const close = useCallback(() => setDialog(null), []);

  // After something is removed or moved, keep keyboard focus somewhere sensible if it was lost.
  const settleFocus = useCallback(
    (fallback) =>
      setTimeout(() => {
        const active = document.activeElement;
        if (active && active !== document.body) return;
        if (fallback.startsWith('note:')) requestFocus(fallback);
        else document.getElementById(fallback)?.focus();
      }, 0),
    [requestFocus],
  );

  const ui = useMemo(
    () => ({
      editNote: (id, scope) => setDialog({ type: 'edit', id, scope }),
      deleteNote: (id, scope) => setDialog({ type: 'deleteNote', id, scope }),
      renameColumn: (id) => setDialog({ type: 'renameColumn', id }),
      deleteColumn: (id) => setDialog({ type: 'deleteColumn', id }),
    }),
    [],
  );

  const note = dialog && (dialog.type === 'edit' || dialog.type === 'deleteNote') ? state.notes.find((n) => n.id === dialog.id) : null;
  const column = dialog && dialog.type === 'deleteColumn' ? state.columns.find((c) => c.id === dialog.id) : null;

  return (
    <UiContext.Provider value={ui}>
      <div className="app">
        <nav className="skip-links" aria-label="Skip links">
          {SKIP_LINKS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="skip-link" onClick={(e) => skipTo(e, id)}>
              {label}
            </a>
          ))}
        </nav>

        <Header onHelp={() => setDialog({ type: 'help' })} onSettings={() => setDialog({ type: 'settings' })} />

        {saveFailed && (
          <div className="notice notice-error banner" role="alert">
            <Icon name="alert" />
            <p>
              <strong>Your notes can’t be saved in this browser.</strong> Storage is full or turned off (private browsing can do this). Use{' '}
              <strong>Export notes</strong> to keep a copy before you close this page.
            </p>
          </div>
        )}

        <main id="main" className="main">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            tags={tags}
            columns={state.columns}
            shown={visibleNotes.length}
            total={state.notes.length}
          />
          <div className="workspace">
            <div className="pane pane-side">
              <NoteForm />
              <NoteList
                notes={visibleNotes}
                total={state.notes.length}
                filtering={filtering}
                placement={placement}
                onClearFilters={() => setFilters(emptyFilters)}
              />
            </div>
            <div className="pane pane-board">
              <Board visibleIds={visibleIds} filtering={filtering} />
            </div>
          </div>
        </main>

        <Toasts />

        {dialog?.type === 'help' && <HelpDialog onClose={close} />}
        {dialog?.type === 'settings' && <SettingsDialog onClose={close} />}

        {dialog?.type === 'edit' && note && (
          <EditNoteDialog
            noteId={note.id}
            onClose={(result) => {
              close();
              // Saving can move a card to another column, so make sure focus lands on the note again.
              if (result?.saved) settleFocus(`note:${dialog.scope}:${note.id}`);
            }}
          />
        )}

        {dialog?.type === 'deleteNote' && note && (
          <ConfirmDialog
            title="Delete this note?"
            confirmLabel="Delete note"
            danger
            onCancel={close}
            onConfirm={() => {
              actions.deleteNote(note.id);
              close();
              settleFocus(dialog.scope === 'board' ? 'board-heading' : 'notes-heading');
            }}
          >
            <p>
              The note <strong>“{short(note.title, 80)}”</strong> will be removed from your notes list and from the board.
            </p>
            <p>Right after deleting, you can choose Undo to bring it back.</p>
          </ConfirmDialog>
        )}

        {dialog?.type === 'renameColumn' && <RenameColumnDialog columnId={dialog.id} onClose={close} />}

        {dialog?.type === 'deleteColumn' && column && (
          <ConfirmDialog
            title="Delete this column?"
            confirmLabel="Delete column"
            danger
            onCancel={close}
            onConfirm={() => {
              actions.deleteColumn(column.id);
              close();
              settleFocus('board-heading');
            }}
          >
            <p>
              The column <strong>“{short(column.name, 60)}”</strong> will be removed from the board.
            </p>
            <p>
              {column.noteIds.length === 0
                ? 'It has no notes.'
                : `Its ${column.noteIds.length} ${column.noteIds.length === 1 ? 'note stays' : 'notes stay'} in your notes list but ${column.noteIds.length === 1 ? 'is' : 'are'} no longer on the board.`}{' '}
              Right after deleting, you can choose Undo to bring it back.
            </p>
          </ConfirmDialog>
        )}
      </div>
    </UiContext.Provider>
  );
}

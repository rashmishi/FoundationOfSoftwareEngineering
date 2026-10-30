import { useNotes } from './state/NotesContext';
import { ImportExport } from './components/ImportExport';
import { KanbanBoard } from './components/KanbanBoard';
import { NoteForm } from './components/NoteForm';
import { NoteList } from './components/NoteList';
import { StatusMessage } from './components/StatusMessage';

export default function App() {
  const { dispatch, announce } = useNotes();

  return (
    <div className="app">
      <a className="skip-link" href="#board-heading">
        Skip to board
      </a>
      <header className="app-header">
        <h1>Notes Kanban</h1>
        <ImportExport />
      </header>
      <StatusMessage />
      <div className="layout">
        <aside className="notes-panel" aria-label="Notes">
          <section aria-labelledby="new-note-heading">
            <h2 id="new-note-heading">New note</h2>
            <NoteForm
              label="New note"
              submitLabel="Add note"
              onSubmit={(note) => {
                dispatch({ type: 'addNote', note });
                announce('success', `Note “${note.title}” created.`);
              }}
            />
          </section>
          <NoteList />
        </aside>
        <main className="board-panel" aria-label="Kanban board">
          <KanbanBoard />
        </main>
      </div>
    </div>
  );
}

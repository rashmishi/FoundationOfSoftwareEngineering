import { useNotes } from '../state/NotesContext';
import { AddColumnForm } from './AddColumnForm';
import { KanbanColumn } from './KanbanColumn';

export function KanbanBoard() {
  const { state } = useNotes();
  return (
    <section className="board-section" aria-labelledby="board-heading">
      <h2 id="board-heading" tabIndex={-1}>
        Board
      </h2>
      <div className="board">
        {state.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            notes={state.notes.filter((n) => n.columnId === column.id)}
          />
        ))}
      </div>
      <AddColumnForm />
    </section>
  );
}

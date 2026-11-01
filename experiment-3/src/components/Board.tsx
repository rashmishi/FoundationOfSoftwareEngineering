import { useStore } from '../state/StoreContext';
import { AddColumnForm } from './AddColumnForm';
import { BoardColumn } from './BoardColumn';

/** Kanban board (FR-5, FR-6). */
export function Board() {
  const { state } = useStore();
  return (
    <section aria-labelledby="board-heading" className="panel board">
      <h2 id="board-heading">Board</h2>
      <AddColumnForm />
      {state.columns.length === 0 ? (
        <p>The board has no columns yet. Add one with the form above.</p>
      ) : (
        <ul aria-label="Board columns" className="columns">
          {state.columns.map((column) => (
            <BoardColumn key={column.id} column={column} />
          ))}
        </ul>
      )}
    </section>
  );
}

import { useBoard } from '../state/BoardContext';
import { focusKeys } from '../state/focusKeys';
import { AddColumnForm } from './AddColumnForm';
import { BoardColumn } from './BoardColumn';

export function Board({ dropColumnId }: { dropColumnId: string | null }) {
  const { state } = useBoard();
  return (
    <section className="panel board-panel" aria-labelledby="board-heading">
      <h2 id="board-heading" tabIndex={-1} data-focus={focusKeys.boardHeading}>
        Board
      </h2>
      <AddColumnForm />
      {/* Named, keyboard-scrollable region for the horizontally scrolling board. */}
      <div className="board-scroll" role="region" aria-label="Board columns" tabIndex={0}>
        {state.columns.length === 0 ? (
          <p className="empty">No columns yet. Add one with the Column name field above.</p>
        ) : (
          <ul className="columns" aria-label="Columns">
            {state.columns.map((column, i) => (
              <BoardColumn
                key={column.id}
                column={column}
                index={i}
                count={state.columns.length}
                isDropTarget={dropColumnId === column.id}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

import { matchesFilters, type Filters } from '../model/filter';
import { isDoneColumn } from '../model/notes';
import type { BoardState, Note } from '../types';
import { AddColumnForm } from './AddColumnForm';
import { Column } from './Column';

interface BoardProps {
  state: BoardState;
  filters: Filters;
  filtering: boolean;
  today: string;
  onAddColumn: (name: string) => string | null;
}

export function Board({ state, filters, filtering, today, onAddColumn }: BoardProps) {
  const byId = new Map<string, Note>(state.notes.map((n) => [n.id, n]));
  return (
    <section className="board-panel" aria-labelledby="board-heading">
      <h2 id="board-heading" className="panel-heading">
        Board
      </h2>
      <div className="board">
        {state.columns.map((column, index) => {
          const done = isDoneColumn(column);
          const notes = column.noteIds
            .map((id) => byId.get(id))
            .filter((n): n is Note => n !== undefined && matchesFilters(n, filters, today, done));
          return (
            <Column key={column.id} column={column} notes={notes} index={index} columnCount={state.columns.length} filtering={filtering} />
          );
        })}
        <AddColumnForm onAdd={onAddColumn} />
      </div>
    </section>
  );
}

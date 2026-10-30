import type { Note } from '../types';
import { MoveToColumn } from './MoveToColumn';
import { TagList } from './TagList';
import { useNoteDrag } from './useNoteDrag';

export function KanbanCard({ note }: { note: Note }) {
  const { isDragging, dragProps } = useNoteDrag(note.id);
  return (
    <li className={`card${isDragging ? ' is-dragging' : ''}`} {...dragProps} data-testid={`card-${note.id}`}>
      <h4 className="card-title">{note.title}</h4>
      {note.description && <p className="card-description">{note.description}</p>}
      <TagList tags={note.tags} />
      <MoveToColumn note={note} />
    </li>
  );
}

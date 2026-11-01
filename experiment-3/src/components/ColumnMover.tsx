import { useEffect, useState } from 'react';
import { columnName, moveNote } from '../model/reducer';
import type { Note, Variant } from '../model/types';
import { useAnnouncer } from '../state/AnnouncerContext';
import { useRequestFocus } from '../state/FocusContext';
import { useStore } from '../state/StoreContext';

interface Props {
  note: Note;
  variant: Variant;
  /** Appended to accessible names on board cards, e.g. " (Done column)". */
  nameSuffix: string;
}

/**
 * Non-dragging alternative to drag-and-drop (FR-5.6, WCAG 2.5.7): choosing a
 * column only changes the select; the note moves when Move is activated.
 */
export function ColumnMover({ note, variant, nameSuffix }: Props) {
  const { state, dispatch } = useStore();
  const { announce } = useAnnouncer();
  const requestFocus = useRequestFocus();
  const [selected, setSelected] = useState(note.columnId ?? '');
  const base = `${variant}-${note.id}`;

  // Follow moves made elsewhere (drag-and-drop, the other card's Move button).
  useEffect(() => setSelected(note.columnId ?? ''), [note.columnId]);

  const onMove = () => {
    const target = selected === '' ? null : selected;
    if (target === note.columnId) {
      announce(`'${note.title}' is already ${target ? `in ${columnName(state, target)}` : 'off the board'}.`);
      return;
    }
    dispatch(moveNote(note.id, target));
    announce(target ? `Moved '${note.title}' to ${columnName(state, target)}.` : `Removed '${note.title}' from the board.`);
    // FR-5.6a: list cards stay mounted; board cards re-mount in the target column,
    // or only remain in the list when taken off the board.
    requestFocus(variant === 'board' && target ? `board-${note.id}-move` : `list-${note.id}-move`);
  };

  return (
    <div className="mover">
      <label htmlFor={`${base}-column`}>Column</label>
      <select
        id={`${base}-column`}
        aria-label={`Column for ${note.title}${nameSuffix}`}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Not on board</option>
        {state.columns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        id={`${base}-move`}
        type="button"
        className="btn btn-small"
        aria-label={`Move ${note.title}${nameSuffix}`}
        onClick={onMove}
      >
        Move
      </button>
    </div>
  );
}

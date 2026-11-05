import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Column, Note } from '../model/types';
import { plural } from '../model/selectors';
import { useBoard } from '../state/BoardContext';
import { useDialogs } from '../state/DialogContext';
import { useFilters } from '../state/FilterContext';
import { useFocusManager } from '../state/FocusContext';
import { focusKeys } from '../state/focusKeys';
import { useKeyboardMove } from '../state/KeyboardMoveContext';
import { usePreferences } from '../state/PreferencesContext';
import { useToasts } from '../state/ToastContext';
import { quote } from '../state/useNoteActions';
import { IconButton } from './IconButton';
import { MenuButton } from './MenuButton';
import { CardPreview, NoteCard } from './NoteCard';

function SortableCard({ note, column }: { note: Note; column: Column }) {
  const { reducedMotion } = usePreferences();
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: `card:${note.id}`,
    data: { noteId: note.id, place: 'board', columnId: column.id },
  });
  const style = { transform: CSS.Translate.toString(transform), transition: reducedMotion ? undefined : transition };
  return (
    <li>
      <NoteCard note={note} place="board" column={column} drag={{ setNodeRef, listeners, style, isDragging }} />
    </li>
  );
}

type Entry = { kind: 'note'; note: Note } | { kind: 'ghost'; note: Note };

export function BoardColumn({ column, index, count, isDropTarget }: { column: Column; index: number; count: number; isDropTarget: boolean }) {
  const { state, commit } = useBoard();
  const { matchingIds, active } = useFilters();
  const { openDialog } = useDialogs();
  const { requestFocus } = useFocusManager();
  const { notify } = useToasts();
  const { moving } = useKeyboardMove();
  const { setNodeRef } = useDroppable({ id: `col:${column.id}`, data: { columnId: column.id } });
  const context = `column ${quote(column.name)}`;
  const bodyId = `col-body-${column.id}`;
  const headingId = `col-heading-${column.id}`;

  const notesById = new Map(state.notes.map((n) => [n.id, n]));
  const notes = column.noteIds.map((id) => notesById.get(id)).filter((n): n is Note => Boolean(n));

  // Keyboard move preview: an inert copy at the target position (counted without the moving note).
  const entries: Entry[] = [];
  const ghostHere = moving && moving.current.columnId === column.id ? moving : null;
  const ghostNote = ghostHere ? notesById.get(ghostHere.noteId) : undefined;
  if (ghostHere && ghostNote) {
    // The moving note itself stays in place (it keeps focus); the preview goes before the note now at the target index.
    const before = notes.filter((n) => n.id !== ghostNote.id)[ghostHere.current.index];
    for (const note of notes) {
      if (note.id === before?.id) entries.push({ kind: 'ghost', note: ghostNote });
      entries.push({ kind: 'note', note });
    }
    if (!before) entries.push({ kind: 'ghost', note: ghostNote });
  } else {
    for (const note of notes) entries.push({ kind: 'note', note });
  }

  const visible = entries.filter((e) => e.kind === 'ghost' || matchingIds.has(e.note.id) || e.note.id === moving?.noteId);
  const shownCount = notes.filter((n) => matchingIds.has(n.id)).length;
  const countText = active ? `${shownCount} of ${plural(notes.length, 'note')} shown` : plural(notes.length, 'note');

  const toggle = (focusKey: string) => {
    commit({ type: 'toggleColumn', id: column.id });
    requestFocus(focusKey);
  };
  const moveColumn = (delta: -1 | 1) => {
    commit({ type: 'moveColumn', id: column.id, delta });
    notify({ text: `Column ${quote(column.name)} moved ${delta < 0 ? 'left' : 'right'}, now column ${index + 1 + delta} of ${count}.` });
    requestFocus(focusKeys.columnMenu(column.id));
  };

  return (
    <li className="column-item">
      <section
        ref={setNodeRef}
        className={`column${column.collapsed ? ' collapsed' : ''}${isDropTarget || ghostHere ? ' drop-target' : ''}`}
        aria-labelledby={headingId}
        data-kbd-target={ghostHere && column.collapsed ? '' : undefined}
      >
        <div className="column-header">
          <IconButton
            icon={column.collapsed ? 'chevron-right' : 'chevron-down'}
            label={column.collapsed ? 'Expand' : 'Collapse'}
            context={context}
            focusKey={focusKeys.columnToggle(column.id)}
            aria-expanded={!column.collapsed}
            aria-controls={bodyId}
            onClick={() => toggle(focusKeys.columnToggle(column.id))}
          />
          <h3 id={headingId} className="column-title" tabIndex={-1} data-focus={focusKeys.columnHeading(column.id)}>
            {column.name} <span className="column-count">({countText})</span>
          </h3>
          <MenuButton
            context={context}
            focusKey={focusKeys.columnMenu(column.id)}
            items={[
              { label: 'Rename column', onSelect: () => openDialog({ type: 'renameColumn', columnId: column.id }) },
              { label: 'Move column left', unavailable: index === 0 ? 'It is already the first column.' : undefined, onSelect: () => moveColumn(-1) },
              { label: 'Move column right', unavailable: index === count - 1 ? 'It is already the last column.' : undefined, onSelect: () => moveColumn(1) },
              { label: column.collapsed ? 'Expand column' : 'Collapse column', onSelect: () => toggle(focusKeys.columnMenu(column.id)) },
              { label: 'Delete column', danger: true, onSelect: () => openDialog({ type: 'deleteColumn', columnId: column.id }) },
            ]}
          />
        </div>
        {isDropTarget && (
          <p className="drop-hint" aria-hidden="true">
            Drop here
          </p>
        )}
        {ghostHere && column.collapsed && (
          // The column body is hidden, so show the keyboard-move target here (announced separately).
          <p className="drop-hint" aria-hidden="true">
            Drop here: end of {column.name}
          </p>
        )}
        <div id={bodyId} className="column-body" hidden={column.collapsed}>
          {visible.length === 0 ? (
            <p className="empty">{notes.length === 0 ? 'No notes in this column.' : 'No notes match the current search.'}</p>
          ) : (
            <SortableContext items={notes.map((n) => `card:${n.id}`)} strategy={verticalListSortingStrategy}>
              <ul className="card-list" data-note-list={column.id} aria-label={`Notes in ${column.name}`}>
                {visible.map((entry) =>
                  entry.kind === 'ghost' ? (
                    <li key={`ghost-${entry.note.id}`} className="ghost-item" aria-hidden="true" data-kbd-target="">
                      <CardPreview note={entry.note} label="New position" />
                    </li>
                  ) : (
                    <SortableCard key={entry.note.id} note={entry.note} column={column} />
                  ),
                )}
              </ul>
            </SortableContext>
          )}
        </div>
      </section>
    </li>
  );
}

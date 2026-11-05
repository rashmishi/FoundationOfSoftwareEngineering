import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import type { Column, Note, Place } from '../model/types';
import { useDialogs } from '../state/DialogContext';
import { useFilters } from '../state/FilterContext';
import { useFocusManager } from '../state/FocusContext';
import { focusKeys } from '../state/focusKeys';
import { useKeyboardMove, type MoveKey } from '../state/KeyboardMoveContext';
import { quote, useNoteActions } from '../state/useNoteActions';
import { IconButton } from './IconButton';
import { InlineTitleEditor } from './InlineTitleEditor';
import { MenuButton, type MenuItem } from './MenuButton';
import { DueDate, PriorityBadge, TagList } from './NoteMeta';

export const DRAG_INSTRUCTIONS_ID = 'drag-instructions';

export interface DragBinding {
  setNodeRef: (el: HTMLElement | null) => void;
  listeners: DraggableSyntheticListeners;
  style?: CSSProperties;
  isDragging: boolean;
}

interface NoteCardProps {
  note: Note;
  place: Place;
  column: Column | undefined;
  drag?: DragBinding;
}

const MOVE_KEYS: MoveKey[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

/** Do not start a pointer drag from form fields or open menus. */
function guardListeners(listeners: DraggableSyntheticListeners): DraggableSyntheticListeners {
  if (!listeners) return listeners;
  const guarded: Record<string, (e: never) => void> = {};
  for (const [name, handler] of Object.entries(listeners)) {
    guarded[name] = ((e: Event) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, [role="menu"], .inline-editor')) return;
      (handler as (e: Event) => void)(e);
    }) as (e: never) => void;
  }
  return guarded as DraggableSyntheticListeners;
}

export function NoteCard({ note, place, column, drag }: NoteCardProps) {
  const [renaming, setRenaming] = useState(false);
  const { openDialog } = useDialogs();
  const { today } = useFilters();
  const { requestFocus } = useFocusManager();
  const { moveNote, updateNote } = useNoteActions();
  const keyboard = useKeyboardMove();
  const movingThis = keyboard.moving?.noteId === note.id && keyboard.moving.place === place;
  const context = `note ${quote(note.title)}`;
  const titleId = `title-${place}-${note.id}`;
  const Heading = place === 'list' ? 'h3' : 'h4';
  const index = column ? column.noteIds.indexOf(note.id) : -1;

  const onHandleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (movingThis) keyboard.drop();
      else {
        if (keyboard.moving) keyboard.cancel();
        keyboard.pickUp(note.id, place);
      }
    } else if (movingThis && MOVE_KEYS.includes(e.key as MoveKey)) {
      e.preventDefault();
      keyboard.step(e.key as MoveKey);
    } else if (movingThis && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      keyboard.cancel();
    }
  };

  const menuItems: MenuItem[] = [
    { label: 'Edit', onSelect: () => openDialog({ type: 'edit', noteId: note.id }) },
    { label: 'Rename', onSelect: () => setRenaming(true) },
    { label: 'Move to…', onSelect: () => openDialog({ type: 'move', noteId: note.id, place, origin: 'menu' }) },
    {
      label: 'Move up',
      unavailable: !column ? 'The note is not on the board.' : index === 0 ? `Already at the top of ${column.name}.` : undefined,
      onSelect: () => column && moveNote(note.id, column.id, index - 1, [focusKeys.noteMenu(place, note.id), focusKeys.notesHeading]),
    },
    {
      label: 'Move down',
      unavailable:
        !column ? 'The note is not on the board.' : index === column.noteIds.length - 1 ? `Already at the bottom of ${column.name}.` : undefined,
      onSelect: () => column && moveNote(note.id, column.id, index + 1, [focusKeys.noteMenu(place, note.id), focusKeys.notesHeading]),
    },
    ...(column
      ? [{
          label: 'Remove from board',
          onSelect: () => moveNote(note.id, null, 0, [focusKeys.noteMenu('list', note.id), focusKeys.notesHeading]),
        }]
      : []),
    { label: 'Delete', danger: true, onSelect: () => openDialog({ type: 'deleteNote', noteId: note.id, place }) },
  ];

  const finishRename = (title: string | null, returnFocus: boolean) => {
    setRenaming(false);
    const target = returnFocus ? [focusKeys.title(place, note.id)] : [];
    if (title !== null && title !== note.title) updateNote(note.id, { title }, target);
    else if (returnFocus) requestFocus(...target);
  };

  const body: ReactNode = (
    <>
      {note.description && <p className="note-desc">{note.description}</p>}
      <TagList tags={note.tags} />
      <div className="note-meta">
        <PriorityBadge priority={note.priority} />
        <DueDate dueDate={note.dueDate} columnName={column?.name} today={today} />
        {place === 'list' && (
          <span className="note-column">{column ? `Column: ${column.name}` : 'Not on board'}</span>
        )}
      </div>
    </>
  );

  const overdue = note.dueDate !== null && note.dueDate < today && column?.name.trim().toLowerCase() !== 'done';
  const classes = [
    'note-card',
    overdue && 'overdue',
    drag?.isDragging && 'drag-origin',
    movingThis && 'kbd-origin',
  ].filter(Boolean).join(' ');

  return (
    <article
      ref={drag?.setNodeRef}
      style={drag?.style}
      className={classes}
      aria-labelledby={titleId}
      {...guardListeners(drag?.listeners)}
    >
      <div className="note-top">
        <IconButton
          icon="grip"
          label="Drag"
          context={context}
          className="drag-handle"
          focusKey={focusKeys.handle(place, note.id)}
          aria-describedby={DRAG_INSTRUCTIONS_ID}
          aria-pressed={movingThis}
          escapePassthrough
          hint={
            movingThis
              ? `Moving to ${keyboard.currentText} Space to drop, Escape to cancel.`
              : 'Space to pick up, arrows to move, Space to drop, Escape to cancel. Or use Move to…'
          }
          onKeyDown={onHandleKeyDown}
          onBlur={() => {
            if (movingThis) keyboard.cancel();
          }}
        />
        <div className="note-title-area">
          {renaming ? (
            <InlineTitleEditor note={note} onDone={finishRename} />
          ) : (
            <Heading className="note-title" id={titleId}>
              <button
                type="button"
                className="title-button"
                data-focus={focusKeys.title(place, note.id)}
                onClick={() => openDialog({ type: 'edit', noteId: note.id })}
                onKeyDown={(e) => {
                  if (e.key === 'F2') {
                    e.preventDefault();
                    setRenaming(true);
                  }
                }}
              >
                {note.title}
              </button>
            </Heading>
          )}
          {movingThis && <span className="moving-label">Moving</span>}
        </div>
      </div>
      {body}
      <div className="toolbar" role="group" aria-label={`Actions for ${context}`}>
          <IconButton icon="edit" label="Edit" context={context} onClick={() => openDialog({ type: 'edit', noteId: note.id })} />
          <IconButton
            icon="move"
            label="Move to…"
            context={context}
            focusKey={focusKeys.noteMove(place, note.id)}
            onClick={() => openDialog({ type: 'move', noteId: note.id, place, origin: 'toolbar' })}
          />
          <IconButton
            icon="trash"
            label="Delete"
            context={context}
            className="danger"
            onClick={() => openDialog({ type: 'deleteNote', noteId: note.id, place })}
          />
          <MenuButton context={context} items={menuItems} focusKey={focusKeys.noteMenu(place, note.id)} />
      </div>
    </article>
  );
}

/** Static copy of a card for the drag overlay and keyboard-move preview. Hidden from assistive technology. */
export function CardPreview({ note, label }: { note: Note; label: string }) {
  return (
    <div className="note-card preview" aria-hidden="true" inert="">
      <div className="note-top">
        <span className="preview-title">{note.title}</span>
        <span className="moving-label">{label}</span>
      </div>
      {note.tags.length > 0 && <TagList tags={note.tags} />}
    </div>
  );
}

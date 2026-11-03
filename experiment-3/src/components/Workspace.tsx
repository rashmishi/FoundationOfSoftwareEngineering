import { useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, pointerWithin, useSensor, useSensors,
  type Announcements, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { columnOfNote, findNote } from '../model/selectors';
import { useBoard } from '../state/BoardContext';
import { focusKeys } from '../state/focusKeys';
import { usePreferences } from '../state/PreferencesContext';
import { useNoteActions } from '../state/useNoteActions';
import { Board } from './Board';
import { CardPreview } from './NoteCard';
import { NoteList } from './NoteList';

// Our own announcements are made through the toast/announcer, so dnd-kit's are turned off (no duplicates).
const silent: Announcements = {
  onDragStart: () => undefined,
  onDragMove: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

function targetColumn(over: DragOverEvent['over'], stateColumnOf: (noteId: string) => string | undefined): string | null {
  if (!over) return null;
  const data = over.data.current as { columnId?: string; noteId?: string } | undefined;
  if (String(over.id).startsWith('col:')) return data?.columnId ?? null;
  return data?.noteId ? stateColumnOf(data.noteId) ?? null : null;
}

export function Workspace() {
  const { state } = useBoard();
  const { reducedMotion } = usePreferences();
  const { moveNote } = useNoteActions();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );
  const columnOf = (noteId: string) => columnOfNote(state, noteId)?.id;

  const onDragStart = (e: DragStartEvent) => setActiveNoteId((e.active.data.current as { noteId: string }).noteId);
  const onDragOver = (e: DragOverEvent) => setDropColumnId(targetColumn(e.over, columnOf));
  const reset = () => {
    setActiveNoteId(null);
    setDropColumnId(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    reset();
    const { active, over } = e;
    const { noteId, place } = active.data.current as { noteId: string; place: 'list' | 'board' };
    const toColumnId = targetColumn(over, columnOf);
    // Dropped outside any column: nothing changes (FR-5.4).
    if (!over || !toColumnId) return;
    const column = state.columns.find((c) => c.id === toColumnId)!;
    const others = column.noteIds.filter((id) => id !== noteId);
    let index = others.length;
    const overNoteId = (over.data.current as { noteId?: string } | undefined)?.noteId;
    if (!String(over.id).startsWith('col:') && overNoteId) {
      if (overNoteId === noteId) return;
      const sameColumn = column.noteIds.includes(noteId);
      index = sameColumn ? column.noteIds.indexOf(overNoteId) : others.indexOf(overNoteId);
    }
    moveNote(noteId, toColumnId, index, place === 'board' ? [focusKeys.title('board', noteId)] : []);
  };

  const activeNote = activeNoteId ? findNote(state, activeNoteId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      accessibility={{ announcements: silent, screenReaderInstructions: { draggable: '' }, restoreFocus: false }}
    >
      <div className="workspace">
        <NoteList />
        <Board dropColumnId={dropColumnId} />
      </div>
      <DragOverlay className="dnd-overlay" dropAnimation={reducedMotion ? null : undefined}>
        {activeNote ? <CardPreview note={activeNote} label="Moving" /> : null}
      </DragOverlay>
    </DndContext>
  );
}

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useRef, useState } from 'react';
import { Board } from './components/Board';
import { DND_INSTRUCTIONS, DND_INSTRUCTIONS_ID } from './components/DragHandle';
import { ImportExport } from './components/ImportExport';
import { NoteForm } from './components/NoteForm';
import { NotesList } from './components/NotesList';
import { StatusBar } from './components/StatusBar';
import { moveNote, resolveDrop } from './model/reducer';
import type { Variant } from './model/types';
import { AnnouncerProvider, useAnnouncer } from './state/AnnouncerContext';
import { EditingProvider } from './state/EditingContext';
import { FocusProvider, useRequestFocus } from './state/FocusContext';
import { KeyboardDragProvider } from './state/KeyboardDragContext';
import { StoreProvider, useStore } from './state/StoreContext';

interface ActiveDrag {
  noteId: string;
  variant: Variant;
  /** Focus was on the handle or another control of the dragged card (which may re-mount). */
  focusWasInCard: boolean;
}

// dnd-kit's own announcements are silenced; the app's Announcer speaks instead (FR-G.2).
const silentAnnouncements = {
  onDragStart: () => undefined,
  onDragMove: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

function Workspace() {
  const { state, dispatch } = useStore();
  const { announce } = useAnnouncer();
  const requestFocus = useRequestFocus();
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const activeRef = useRef<ActiveDrag | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const onDragStart = ({ active: a }: DragStartEvent) => {
    const { noteId, variant } = a.data.current as { noteId: string; variant: Variant };
    const card = document.getElementById(`${variant}-${noteId}-handle`)?.closest('article');
    const drag = { noteId, variant, focusWasInCard: !!card && card.contains(document.activeElement) };
    activeRef.current = drag;
    setActive(drag);
  };

  const onDragEnd = ({ over }: DragEndEvent) => {
    const drag = activeRef.current;
    activeRef.current = null;
    setActive(null);
    if (!drag) return;
    const note = state.notes.find((n) => n.id === drag.noteId);
    if (!note) return;
    const targetId = (over?.data.current as { columnId?: string } | undefined)?.columnId ?? null;
    const result = resolveDrop(state, note.id, targetId);
    if (result.kind === 'same') {
      announce(`'${note.title}' is already in ${result.columnName}.`);
    } else if (result.kind === 'moved') {
      dispatch(moveNote(note.id, targetId));
      announce(`Moved '${note.title}' to ${result.columnName}.`);
      if (drag.focusWasInCard) requestFocus(`board-${note.id}-handle`);
    } else {
      // Dropped outside every column: the assignment is unchanged (FR-5.5).
      announce(`'${note.title}' was not moved.`);
    }
  };

  const activeNote = active ? state.notes.find((n) => n.id === active.noteId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        activeRef.current = null;
        setActive(null);
      }}
      accessibility={{ announcements: silentAnnouncements, screenReaderInstructions: { draggable: DND_INSTRUCTIONS }, restoreFocus: false }}
    >
      <p id={DND_INSTRUCTIONS_ID} className="visually-hidden">
        {DND_INSTRUCTIONS}
      </p>
      <div className="workspace">
        <NotesList />
        <Board />
      </div>
      <DragOverlay dropAnimation={null}>
        {activeNote ? (
          <div className="note-card drag-overlay" aria-hidden="true">
            <p className="note-title">{activeNote.title}</p>
            {activeNote.tags.length > 0 && <p className="muted">{activeNote.tags.join(', ')}</p>}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function App() {
  return (
    <AnnouncerProvider>
      <FocusProvider>
        <StoreProvider>
          <KeyboardDragProvider>
            <EditingProvider>
              <a
                href="#main"
                className="skip-link"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('main')?.focus();
                }}
              >
                Skip to main content
              </a>
              <header className="app-header">
                <h1>Notes &amp; Kanban Board</h1>
              </header>
              <main id="main" tabIndex={-1}>
                <StatusBar />
                <NoteForm />
                <ImportExport />
                <Workspace />
              </main>
            </EditingProvider>
          </KeyboardDragProvider>
        </StoreProvider>
      </FocusProvider>
    </AnnouncerProvider>
  );
}

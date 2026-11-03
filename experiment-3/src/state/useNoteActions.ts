import { useCallback } from 'react';
import { columnOfNote, findNote } from '../model/selectors';
import type { Note, Place } from '../model/types';
import { useBoard } from './BoardContext';
import { useFocusManager } from './FocusContext';
import { focusKeys, neighbourTargets } from './focusKeys';
import { usePreferences } from './PreferencesContext';
import { useToasts } from './ToastContext';

export const quote = (text: string) => `“${text}”`;

/** Shared note operations: state change + undo entry + toast + sound + focus, so every entry point behaves the same. */
export function useNoteActions() {
  const { state, commit } = useBoard();
  const { notify } = useToasts();
  const { requestFocus } = useFocusManager();
  const { play } = usePreferences();

  /**
   * Move a note. toIndex counts positions in the target column without the note itself.
   * focusTargets: where focus should go afterwards (FR-22).
   */
  const moveNote = useCallback(
    (noteId: string, toColumnId: string | null, toIndex: number, focusTargets: string[] = []) => {
      const note = findNote(state, noteId);
      if (!note) return;
      const from = columnOfNote(state, noteId);
      const fromIndex = from ? from.noteIds.indexOf(noteId) : -1;
      const target = toColumnId ? state.columns.find((c) => c.id === toColumnId) : undefined;
      const othersInTarget = target ? target.noteIds.filter((id) => id !== noteId).length : 0;
      const index = Math.max(0, Math.min(toIndex, othersInTarget));
      if ((from?.id ?? null) === toColumnId && (toColumnId === null || fromIndex === index)) {
        notify({ text: `${quote(note.title)} is already there. Nothing changed.`, kind: 'info' });
        requestFocus(...focusTargets);
        return;
      }
      const text =
        toColumnId === null
          ? `${quote(note.title)} removed from the board.`
          : `${quote(note.title)} moved to ${target!.name}, position ${index + 1} of ${othersInTarget + 1}.`;
      const undoId = commit(
        { type: 'moveNote', id: noteId, toColumnId, toIndex: index },
        {
          label: `move note ${quote(note.title)}`,
          undoneText: `${quote(note.title)} moved back${from ? ` to ${from.name}` : ' off the board'}.`,
          affectedFocus: [from ? focusKeys.title('board', noteId) : focusKeys.title('list', noteId)],
        },
      );
      play('drop');
      notify({ text, undoId });
      requestFocus(...focusTargets);
    },
    [state, commit, notify, play, requestFocus],
  );

  const deleteNote = useCallback(
    (noteId: string, place: Place) => {
      const note = findNote(state, noteId);
      if (!note) return;
      const column = columnOfNote(state, noteId);
      const heading = place === 'list' || !column ? focusKeys.notesHeading : focusKeys.columnHeading(column.id);
      const after = neighbourTargets(place, noteId, heading);
      const undoId = commit(
        { type: 'deleteNote', id: noteId },
        {
          label: `delete note ${quote(note.title)}`,
          undoneText: `note ${quote(note.title)} restored.`,
          restoreFocus: [focusKeys.title(place, noteId), focusKeys.title('list', noteId)],
        },
      );
      play('delete');
      notify({ text: `Note ${quote(note.title)} deleted.`, undoId });
      requestFocus(...after);
    },
    [state, commit, notify, play, requestFocus],
  );

  const updateNote = useCallback(
    (noteId: string, changes: Partial<Omit<Note, 'id' | 'createdAt'>>, focusTargets: (string | HTMLElement | null)[] = []) => {
      const note = findNote(state, noteId);
      if (!note) return;
      const title = changes.title ?? note.title;
      const undoId = commit(
        { type: 'updateNote', id: noteId, changes, now: new Date().toISOString() },
        {
          label: `edit note ${quote(title)}`,
          undoneText: `changes to ${quote(note.title)} undone.`,
          affectedFocus: [focusKeys.title('list', noteId)],
        },
      );
      notify({ text: `Note ${quote(title)} saved.`, undoId });
      if (focusTargets.length) requestFocus(...focusTargets);
    },
    [state, commit, notify, requestFocus],
  );

  return { moveNote, deleteNote, updateNote };
}

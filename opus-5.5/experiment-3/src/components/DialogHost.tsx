import { useId, useRef, useState, type FormEvent } from 'react';
import { columnOfNote, findNote, plural } from '../model/selectors';
import type { BoardState, Place } from '../model/types';
import { columnNameError, LIMITS } from '../model/validation';
import { useBoard } from '../state/BoardContext';
import { useDialogs, type DialogSpec } from '../state/DialogContext';
import { useFocusManager } from '../state/FocusContext';
import { focusKeys } from '../state/focusKeys';
import { usePreferences, type ThemeChoice, type ToastDuration } from '../state/PreferencesContext';
import { useToasts } from '../state/ToastContext';
import { quote, useNoteActions } from '../state/useNoteActions';
import { Dialog } from './Dialog';
import { describedBy, FieldError } from './FieldError';
import { HelpContent } from './HelpContent';
import { draftFromNote, NoteFields, noteValuesFromDraft, useNoteForm } from './NoteFields';

function EditNoteDialog({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const { state } = useBoard();
  const note = findNote(state, noteId)!;
  const form = useNoteForm(draftFromNote(note));
  const { updateNote } = useNoteActions();
  const { play } = usePreferences();
  const formId = useId();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.validate()) {
      play('error');
      return;
    }
    onClose();
    updateNote(noteId, noteValuesFromDraft(form.draft));
  };

  return (
    <Dialog
      title="Edit note"
      onClose={onClose}
      initialFocus={form.refs.title}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>Cancel</button>
          <button type="submit" form={formId} className="button primary">Save changes</button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit}>
        <NoteFields form={form} />
      </form>
    </Dialog>
  );
}

function MoveNoteDialog({ noteId, place, origin, onClose }: { noteId: string; place: Place; origin: 'toolbar' | 'menu'; onClose: () => void }) {
  const { state } = useBoard();
  const { moveNote } = useNoteActions();
  const note = findNote(state, noteId)!;
  const current = columnOfNote(state, noteId);
  const [columnId, setColumnId] = useState<string>(current?.id ?? '');
  const target = state.columns.find((c) => c.id === columnId);
  const others = target ? target.noteIds.filter((id) => id !== noteId).length : 0;
  const initialIndex = target && target.id === current?.id ? current.noteIds.indexOf(noteId) : others;
  const [position, setPosition] = useState<number>(initialIndex);
  const columnRef = useRef<HTMLSelectElement>(null);
  const id = useId();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    onClose();
    const newPlace: Place = place === 'list' ? 'list' : columnId ? 'board' : 'list';
    const key = origin === 'toolbar' ? focusKeys.noteMove(newPlace, noteId) : focusKeys.noteMenu(newPlace, noteId);
    moveNote(noteId, columnId || null, Math.min(position, others), [key, focusKeys.title('list', noteId), focusKeys.notesHeading]);
  };

  return (
    <Dialog
      title="Move note"
      description={<p>Choose where to put {quote(note.title)}. Nothing moves until you press Move.</p>}
      onClose={onClose}
      initialFocus={columnRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>Cancel</button>
          <button type="submit" form={`${id}-form`} className="button primary">Move</button>
        </>
      }
    >
      <form id={`${id}-form`} noValidate onSubmit={onSubmit} className="note-fields">
        <div className="field">
          <label htmlFor={`${id}-col`}>Column</label>
          <select
            ref={columnRef}
            id={`${id}-col`}
            value={columnId}
            onChange={(e) => {
              const next = e.target.value;
              setColumnId(next);
              const t = state.columns.find((c) => c.id === next);
              const n = t ? t.noteIds.filter((x) => x !== noteId).length : 0;
              setPosition(t && t.id === current?.id ? current.noteIds.indexOf(noteId) : n);
            }}
          >
            <option value="">Not on board</option>
            {state.columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.id === current?.id ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>
        {target && (
          <div className="field">
            <label htmlFor={`${id}-pos`}>Position</label>
            <select id={`${id}-pos`} value={Math.min(position, others)} onChange={(e) => setPosition(Number(e.target.value))}>
              {Array.from({ length: others + 1 }, (_, i) => (
                <option key={i} value={i}>
                  Position {i + 1}
                  {i === 0 ? ' (top)' : ''}
                  {i === others && i > 0 ? ' (bottom)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </form>
    </Dialog>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      title={title}
      description={<p>{message}</p>}
      onClose={onClose}
      initialFocus={cancelRef}
      footer={
        <>
          <button ref={cancelRef} type="button" className="button" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="button danger"
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}

function RenameColumnDialog({ columnId, onClose }: { columnId: string; onClose: () => void }) {
  const { state, commit } = useBoard();
  const { notify } = useToasts();
  const { requestFocus } = useFocusManager();
  const column = state.columns.find((c) => c.id === columnId)!;
  const [name, setName] = useState(column.name);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = columnNameError(name, state.columns, columnId);
    setError(err);
    if (err) {
      inputRef.current?.focus();
      return;
    }
    onClose();
    if (name.trim() !== column.name) {
      commit({ type: 'renameColumn', id: columnId, name: name.trim() });
      notify({ text: `Column ${quote(column.name)} renamed to ${quote(name.trim())}.` });
    }
    requestFocus(focusKeys.columnMenu(columnId));
  };

  return (
    <Dialog
      title="Rename column"
      onClose={onClose}
      initialFocus={inputRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>Cancel</button>
          <button type="submit" form={`${id}-form`} className="button primary">Save name</button>
        </>
      }
    >
      <form id={`${id}-form`} noValidate onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor={`${id}-name`}>
            Column name <span className="required">(required)</span>
          </label>
          <p id={`${id}-hint`} className="hint">Up to {LIMITS.columnName} characters.</p>
          <input
            ref={inputRef}
            id={`${id}-name`}
            type="text"
            required
            autoComplete="off"
            value={name}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(`${id}-hint`, error && `${id}-err`)}
            onChange={(e) => setName(e.target.value)}
          />
          <FieldError id={`${id}-err`} message={error} />
        </div>
      </form>
    </Dialog>
  );
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { prefs, setPref } = usePreferences();
  const id = useId();
  return (
    <Dialog title="Settings" onClose={onClose} footer={<button type="button" className="button primary" onClick={onClose}>Close</button>}>
      <div className="settings">
        <fieldset>
          <legend>Theme</legend>
          {(['system', 'light', 'dark'] as ThemeChoice[]).map((t) => (
            <label key={t} className="choice">
              <input type="radio" name={`${id}-theme`} value={t} checked={prefs.theme === t} onChange={() => setPref('theme', t)} />
              {t === 'system' ? 'Same as my device' : t === 'light' ? 'Light' : 'Dark'}
            </label>
          ))}
        </fieldset>
        <label className="choice">
          <input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => setPref('reduceMotion', e.target.checked)} />
          Reduce motion
        </label>
        <p className="hint">Turns off movement animations. Motion is also reduced when your device asks for it.</p>
        <label className="choice">
          <input type="checkbox" checked={prefs.sound} onChange={(e) => setPref('sound', e.target.checked)} />
          Sound effects
        </label>
        <p className="hint">Short, quiet sounds when you add, move or delete notes. Off by default.</p>
        <div className="field">
          <label htmlFor={`${id}-toast`}>Keep notifications for</label>
          <select
            id={`${id}-toast`}
            value={prefs.toastDuration}
            onChange={(e) => setPref('toastDuration', Number(e.target.value) as ToastDuration)}
          >
            <option value={5}>5 seconds</option>
            <option value={8}>8 seconds</option>
            <option value={15}>15 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={0}>Keep until I close them</option>
          </select>
          <p className="hint">Error messages always stay until you close them.</p>
        </div>
      </div>
    </Dialog>
  );
}

function ImportDialog({ incoming, fileName, onClose }: { incoming: BoardState; fileName: string; onClose: () => void }) {
  const { state, commit } = useBoard();
  const { notify } = useToasts();
  const { requestFocus } = useFocusManager();
  const message =
    `Replace ${plural(state.notes.length, 'note')} and ${plural(state.columns.length, 'column')} with ` +
    `${plural(incoming.notes.length, 'note')} and ${plural(incoming.columns.length, 'column')} from ${quote(fileName)}? You can undo this.`;
  return (
    <ConfirmDialog
      title="Import notes"
      message={message}
      confirmLabel="Replace notes"
      onClose={onClose}
      onConfirm={() => {
        const undoId = commit(
          { type: 'replaceAll', state: incoming },
          { label: `import from ${quote(fileName)}`, undoneText: 'import undone. Your previous notes are back.', affectedFocus: [focusKeys.notesHeading] },
        );
        notify({ text: `Imported ${plural(incoming.notes.length, 'note')} and ${plural(incoming.columns.length, 'column')}.`, undoId });
        requestFocus(focusKeys.notesHeading);
      }}
    />
  );
}

function DeleteColumnDialog({ columnId, onClose }: { columnId: string; onClose: () => void }) {
  const { state, commit } = useBoard();
  const { notify } = useToasts();
  const { requestFocus } = useFocusManager();
  const { play } = usePreferences();
  const i = state.columns.findIndex((c) => c.id === columnId);
  const column = state.columns[i];
  return (
    <ConfirmDialog
      title="Delete column"
      message={`Delete column ${quote(column.name)}? Its ${plural(column.noteIds.length, 'note')} stay in the note list, not on the board. You can undo this.`}
      confirmLabel="Delete column"
      onClose={onClose}
      onConfirm={() => {
        const next = state.columns[i + 1];
        const prev = state.columns[i - 1];
        const undoId = commit(
          { type: 'deleteColumn', id: columnId },
          { label: `delete column ${quote(column.name)}`, undoneText: `column ${quote(column.name)} restored.`, restoreFocus: [focusKeys.columnHeading(columnId)] },
        );
        play('delete');
        notify({ text: `Column ${quote(column.name)} deleted.`, undoId });
        requestFocus(next && focusKeys.columnMenu(next.id), prev && focusKeys.columnMenu(prev.id), focusKeys.boardHeading);
      }}
    />
  );
}

function renderDialog(dialog: DialogSpec, onClose: () => void, deleteNote: (id: string, place: Place) => void, state: BoardState) {
  switch (dialog.type) {
    case 'edit':
      return findNote(state, dialog.noteId) ? <EditNoteDialog noteId={dialog.noteId} onClose={onClose} /> : null;
    case 'move':
      return findNote(state, dialog.noteId) ? <MoveNoteDialog {...dialog} onClose={onClose} /> : null;
    case 'deleteNote': {
      const note = findNote(state, dialog.noteId);
      if (!note) return null;
      return (
        <ConfirmDialog
          title="Delete note"
          message={`Delete note ${quote(note.title)}? You can undo this for a short time.`}
          confirmLabel="Delete note"
          onClose={onClose}
          onConfirm={() => deleteNote(dialog.noteId, dialog.place)}
        />
      );
    }
    case 'renameColumn':
      return state.columns.some((c) => c.id === dialog.columnId) ? <RenameColumnDialog columnId={dialog.columnId} onClose={onClose} /> : null;
    case 'deleteColumn':
      return state.columns.some((c) => c.id === dialog.columnId) ? <DeleteColumnDialog columnId={dialog.columnId} onClose={onClose} /> : null;
    case 'import':
      return <ImportDialog incoming={dialog.state} fileName={dialog.fileName} onClose={onClose} />;
    case 'settings':
      return <SettingsDialog onClose={onClose} />;
    case 'help':
      return (
        <Dialog title="Keyboard help" onClose={onClose} footer={<button type="button" className="button primary" onClick={onClose}>Close</button>}>
          <HelpContent />
        </Dialog>
      );
  }
}

export function DialogHost() {
  const { dialog, closeDialog } = useDialogs();
  const { state } = useBoard();
  const { deleteNote } = useNoteActions();
  if (!dialog) return null;
  return renderDialog(dialog, closeDialog, deleteNote, state);
}

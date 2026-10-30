import { useNotes } from '../state/NotesContext';

/**
 * Live regions stay mounted so screen readers pick up changes. Success messages are
 * polite (role=status); errors are assertive (role=alert).
 */
export function StatusMessage() {
  const { status } = useNotes();
  const success = status?.kind === 'success' ? status : null;
  const error = status?.kind === 'error' ? status : null;
  return (
    <div className="status-area">
      <div role="status" className={success ? 'message success' : 'message-empty'}>
        {success && <span key={success.id}>{success.text}</span>}
      </div>
      <div role="alert" className={error ? 'message error' : 'message-empty'}>
        {error && <span key={error.id}>{error.text}</span>}
      </div>
    </div>
  );
}

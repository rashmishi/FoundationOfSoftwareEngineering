/** Inline error tied to a field via aria-describedby; colour is never the only cue (AR-P8). */
export function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      <span aria-hidden="true" className="field-error-icon">
        ⚠
      </span>
      <span className="visually-hidden">Error: </span>
      {message}
    </p>
  );
}

interface FieldErrorProps {
  id: string;
  message: string | null;
}

/** The alert wrapper stays mounted so that screen readers announce new errors. */
export function FieldError({ id, message }: FieldErrorProps) {
  return (
    <div id={id} role="alert">
      {message && (
        <p className="field-error">
          <span aria-hidden="true">!</span> {message}
        </p>
      )}
    </div>
  );
}

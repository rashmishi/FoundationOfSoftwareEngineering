import { Icon } from './Icon';

/** Error text with an icon, linked to its field with aria-describedby (A-UN-3). Not colour alone. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      <Icon name="error" />
      <span>{message}</span>
    </p>
  );
}

export function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  const list = ids.filter(Boolean).join(' ');
  return list || undefined;
}

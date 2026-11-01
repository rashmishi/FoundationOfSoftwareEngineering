import type { NoteInput } from '../model/reducer';
import { FieldError } from './FieldError';

interface Props {
  idPrefix: string;
  values: NoteInput;
  onChange: (values: NoteInput) => void;
  titleError: string | null;
}

/** Title / Description / Tags fields shared by the create and edit forms. */
export function NoteFields({ idPrefix, values, onChange, titleError }: Props) {
  const titleId = `${idPrefix}-title`;
  const errorId = `${titleId}-error`;
  const tagsHelpId = `${idPrefix}-tags-help`;
  return (
    <>
      <div className="field">
        <label htmlFor={titleId}>
          Title <span className="required-text">(required)</span>
        </label>
        <input
          id={titleId}
          type="text"
          required
          aria-required="true"
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? errorId : undefined}
          autoComplete="off"
          value={values.title}
          onChange={(e) => onChange({ ...values, title: e.target.value })}
        />
        <FieldError id={errorId} message={titleError} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-description`}>Description</label>
        <textarea
          id={`${idPrefix}-description`}
          rows={3}
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-tags`}>Tags</label>
        <input
          id={`${idPrefix}-tags`}
          type="text"
          autoComplete="off"
          aria-describedby={tagsHelpId}
          value={values.tags}
          onChange={(e) => onChange({ ...values, tags: e.target.value })}
        />
        <p id={tagsHelpId} className="help-text">
          Separate tags with commas, for example: work, urgent
        </p>
      </div>
    </>
  );
}

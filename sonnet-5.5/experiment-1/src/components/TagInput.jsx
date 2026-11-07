import { useId } from 'react';
import { LIMITS, normalizeTag, normalizeTags } from '../lib/store.js';
import { TagChip } from './Badges.jsx';

/**
 * Chip-style tag editor. Enter or comma adds the typed tag; Backspace on an
 * empty field removes the last one. The unfinished text (`draft`) is owned by
 * the parent so a form submit can include it.
 */
export default function TagInput({ id, tags, draft, onTagsChange, onDraftChange, suggestions = [], describedBy }) {
  const listId = useId();

  const commit = (text) => {
    onTagsChange(normalizeTags([...tags, ...text.split(',')]));
    onDraftChange('');
  };

  return (
    <div className="tag-input">
      {tags.map((t) => (
        <TagChip key={t.toLowerCase()} tag={t} onRemove={() => onTagsChange(tags.filter((x) => x !== t))} />
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        list={listId}
        maxLength={LIMITS.tag}
        autoComplete="off"
        aria-describedby={describedBy}
        placeholder={tags.length ? '' : 'Type a tag and press Enter'}
        disabled={tags.length >= LIMITS.tags}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) commit(v);
          else onDraftChange(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && normalizeTag(draft)) {
            e.preventDefault(); // add the tag rather than submitting the form
            commit(draft);
          } else if (e.key === 'Backspace' && !draft && tags.length) {
            onTagsChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => normalizeTag(draft) && commit(draft)}
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}

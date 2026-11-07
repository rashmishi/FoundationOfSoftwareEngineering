import { isValidISODate } from './dates.js';

export const PRIORITIES = ['none', 'low', 'medium', 'high'];
export const PRIORITY_LABELS = { none: 'None', low: 'Low', medium: 'Medium', high: 'High' };

export const LIMITS = {
  title: 120,
  description: 2000,
  tag: 30,
  tags: 10,
  columnName: 40,
};

/** Trims, strips a leading #, collapses spaces. */
export function normalizeTag(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Adds one tag to a list. Returns { tags, error, added, duplicate }.
 * Duplicates are detected case-insensitively and are reported, not treated as a hard error.
 */
export function addTag(tags, raw) {
  const tag = normalizeTag(raw);
  if (!tag) return { tags, error: null, added: false };
  if (tag.length > LIMITS.tag) {
    return { tags, error: `A tag can be at most ${LIMITS.tag} characters. “${tag.slice(0, 12)}…” is ${tag.length}.`, added: false };
  }
  if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
    return { tags, error: null, added: false, duplicate: tag };
  }
  if (tags.length >= LIMITS.tags) {
    return { tags, error: `You can add up to ${LIMITS.tags} tags. Remove one to add another.`, added: false };
  }
  return { tags: [...tags, tag], error: null, added: true };
}

/** Validates the values of the note form. Returns an object of field -> message (empty when valid). */
export function validateNote({ title = '', description = '', dueDate = '' }) {
  const errors = {};
  const t = title.trim();
  if (!t) {
    errors.title = 'Enter a title. A note needs a title before it can be saved.';
  } else if (t.length > LIMITS.title) {
    errors.title = `Shorten the title to ${LIMITS.title} characters or fewer. It is now ${t.length}.`;
  }
  if (description.length > LIMITS.description) {
    errors.description = `Shorten the description to ${LIMITS.description} characters or fewer. It is now ${description.length}.`;
  }
  if (dueDate && !isValidISODate(dueDate)) {
    errors.dueDate = 'Enter a real date in the format YYYY-MM-DD, for example 2026-12-31.';
  }
  return errors;
}

export function validateColumnName(name, columns, ignoreId = null) {
  const n = String(name ?? '').trim();
  if (!n) return 'Enter a column name, for example “Review”.';
  if (n.length > LIMITS.columnName) return `Shorten the name to ${LIMITS.columnName} characters or fewer. It is now ${n.length}.`;
  if (columns.some((c) => c.id !== ignoreId && c.name.trim().toLowerCase() === n.toLowerCase())) {
    return `A column named “${n}” already exists. Choose a different name.`;
  }
  return null;
}

/** Stable colour for a tag, so the same tag always has the same colour. */
export function tagHue(tag) {
  const hues = [215, 160, 280, 28, 335, 100, 190, 48];
  let h = 0;
  const s = tag.toLowerCase();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return hues[h % hues.length];
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n) => String(n).padStart(2, '0');

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Parses YYYY-MM-DD as a local calendar date. Returns null for anything that is not a real date. */
export function parseISODate(value) {
  const m = ISO.exec(value || '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function isValidISODate(value) {
  return parseISODate(value) !== null;
}

export function formatDate(value) {
  const date = parseISODate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

/** 'overdue' | 'today' | 'upcoming' | null (no due date). ISO strings compare correctly as text. */
export function dueStatus(due, today = todayISO()) {
  if (!due || !isValidISODate(due)) return null;
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'upcoming';
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from, to) {
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (!a || !b) return 0;
  return Math.round((b - a) / 86400000);
}

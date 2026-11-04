export type DueStatus = 'overdue' | 'today' | 'upcoming';

function toIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Today's date where the user is, as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  return toIso(now);
}

export function addDays(iso: string, days: number): string {
  const date = fromIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

export function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toIso(fromIso(value)) === value;
}

export function dueStatus(dueDate: string | null, today: string): DueStatus | null {
  if (!dueDate) return null;
  if (dueDate < today) return 'overdue';
  return dueDate === today ? 'today' : 'upcoming';
}

/** Formats a date in the user's own language, such as "Nov 4, 2026" or "4 Nov 2026". */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(fromIso(iso));
}

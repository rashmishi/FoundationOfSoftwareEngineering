export type DueStatus = 'overdue' | 'today' | 'soon' | 'later';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Today's local calendar date as `YYYY-MM-DD`. */
export function todayISO(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

export function dueStatus(dueDate: string | null, today: string): DueStatus | null {
  if (!dueDate) return null;
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  if (dueDate <= addDays(today, 7)) return 'soon';
  return 'later';
}

const formatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return formatter.format(new Date(y, m - 1, d));
}

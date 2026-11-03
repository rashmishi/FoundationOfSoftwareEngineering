import { dueStatus, formatLongDate } from '../model/dates';
import { tagColour } from '../model/tags';
import type { Priority } from '../model/types';
import { Icon } from './Icon';

const PRIORITY_LABEL: Record<Exclude<Priority, 'none'>, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_BARS = { low: 'bars1', medium: 'bars2', high: 'bars3' } as const;

/** Word + icon shape + colour, never colour alone (FR-8.1). */
export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'none') return null;
  return (
    <span className={`badge prio-${priority}`}>
      <Icon name={PRIORITY_BARS[priority]} />
      {PRIORITY_LABEL[priority]} priority
    </span>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="chips" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag} className={`chip tag-${tagColour(tag)}`}>
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function DueDate({ dueDate, columnName, today }: { dueDate: string | null; columnName?: string; today: string }) {
  if (!dueDate) return null;
  const status = dueStatus(dueDate, columnName, today);
  return (
    <span className={`due due-${status}`}>
      <Icon name={status === 'overdue' ? 'warning' : 'calendar'} />
      <span>
        {status === 'overdue' && <strong className="due-flag">Overdue: </strong>}
        {status === 'today' && <strong className="due-flag">Due today, </strong>}
        <time dateTime={dueDate}>
          {status === 'today' ? formatLongDate(dueDate) : `${status === 'overdue' ? 'due' : 'Due'} ${formatLongDate(dueDate)}`}
        </time>
      </span>
    </span>
  );
}

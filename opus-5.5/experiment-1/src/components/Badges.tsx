import { tagClass } from '../model/colors';
import { dueStatus, formatDate } from '../model/dates';
import { PRIORITY_LABELS, type Priority } from '../types';
import { CalendarIcon } from './Icons';

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'none') return null;
  return <span className={`badge priority-badge priority-badge-${priority}`}>{PRIORITY_LABELS[priority]} priority</span>;
}

export function DueBadge({ dueDate, today, done }: { dueDate: string | null; today: string; done: boolean }) {
  if (!dueDate) return null;
  const status = done ? 'later' : dueStatus(dueDate, today);
  const date = formatDate(dueDate);
  const text = status === 'overdue' ? `Overdue · ${date}` : status === 'today' ? 'Due today' : `Due ${date}`;
  return (
    <span className={`badge due-badge due-${status}`} title={`Due ${date}`}>
      <CalendarIcon />
      <time dateTime={dueDate}>{text}</time>
    </span>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="tag-list" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag} className={tagClass(tag)}>
          {tag}
        </li>
      ))}
    </ul>
  );
}

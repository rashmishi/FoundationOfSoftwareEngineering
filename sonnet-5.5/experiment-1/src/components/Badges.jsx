import { tagHue } from '../lib/tags.js';
import { daysUntil } from '../lib/store.js';
import Icon from './Icon.jsx';

export const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };

export function TagChip({ tag, onRemove }) {
  return (
    <span className="tag" style={{ '--h': tagHue(tag) }}>
      <span className="tag-text">{tag}</span>
      {onRemove && (
        <button type="button" className="tag-remove" aria-label={`Remove tag ${tag}`} onClick={onRemove}>
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge priority-${priority}`}>
      <Icon name="flag" size={13} />
      <span>{PRIORITY_LABEL[priority]}</span>
      <span className="vh"> priority</span>
    </span>
  );
}

function formatDate(dueDate) {
  const d = new Date(dueDate + 'T00:00:00');
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

export function DueBadge({ dueDate, overdue, today }) {
  const days = daysUntil(dueDate, today);
  let text;
  if (overdue) text = days === -1 ? 'Overdue · yesterday' : `Overdue · ${formatDate(dueDate)}`;
  else if (days === 0) text = 'Due today';
  else if (days === 1) text = 'Due tomorrow';
  else text = `Due ${formatDate(dueDate)}`;
  return (
    <span className={'badge due' + (overdue ? ' overdue' : days === 0 ? ' soon' : '')}>
      <Icon name={overdue ? 'alert' : 'calendar'} size={13} />
      <time dateTime={dueDate}>{text}</time>
    </span>
  );
}

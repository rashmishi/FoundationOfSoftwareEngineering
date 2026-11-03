import { describe, expect, it } from 'vitest';
import { addDays, dueStatus, todayISO } from './dates';

describe('dates', () => {
  it('formats the local date', () => {
    expect(todayISO(new Date(2026, 10, 2, 23, 59))).toBe('2026-11-02');
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });

  it('classifies due dates', () => {
    const today = '2026-11-02';
    expect(dueStatus(null, today)).toBeNull();
    expect(dueStatus('2026-11-01', today)).toBe('overdue');
    expect(dueStatus('2026-11-02', today)).toBe('today');
    expect(dueStatus('2026-11-09', today)).toBe('soon');
    expect(dueStatus('2026-11-10', today)).toBe('later');
  });
});

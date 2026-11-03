import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { addNote, announcements, column, notesList, renderApp } from './helpers';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const count = (re: RegExp) => (announcements().match(re) ?? []).length;

describe('Focus is never lost to <body> when a control removes itself (FR-22)', () => {
  const originalHeight = window.innerHeight;
  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
  });

  it('Clear filters in the note list moves focus to the Notes heading', async () => {
    const { user } = renderApp();
    await addNote(user, 'Apple');
    await user.type(screen.getByLabelText('Search notes'), 'zzz');
    await user.click(notesList().getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Notes' })).toHaveFocus());
  });

  it('Dismissing the import error moves focus to Import notes', async () => {
    const { user } = renderApp();
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['nope'], 'bad.json'));
    const banner = await screen.findByText(/The file is not valid JSON/, { selector: '.import-error span' });
    await user.click(within(banner.closest('.import-error') as HTMLElement).getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Import notes' })).toHaveFocus());
  });

  it('Show next focuses the toast that appears (small viewport, one toast at a time)', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 400, configurable: true });
    const { user } = renderApp();
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['nope'], 'bad.json'));
    await screen.findByText('1 more message', {}, { timeout: 2000 }).catch(() => undefined);
    await addNote(user, 'Queued');
    const showNext = await screen.findByRole('button', { name: 'Show next' });
    await user.click(showNext);
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(document.activeElement?.closest('.toast, h1')).not.toBeNull();
  });
});

describe('Search count announcement (FR-9.3)', () => {
  it('is announced once, after typing pauses, and not after unrelated changes', async () => {
    const { user } = renderApp();
    await addNote(user, 'Apples');
    await addNote(user, 'Bread');
    await sleep(800);
    expect(count(/Showing/g)).toBe(0);
    await user.type(screen.getByLabelText('Search notes'), 'app');
    await sleep(250);
    expect(count(/Showing/g)).toBe(0);
    await sleep(600);
    expect(count(/Showing 1 of 2 notes\./g)).toBe(1);
    await addNote(user, 'Cherries');
    await sleep(800);
    expect(count(/Showing/g)).toBe(1);
  });
});

describe('Keyboard move target is visible (FR-6.5)', () => {
  it('shows the target in the tooltip and in a collapsed column', async () => {
    const { user } = renderApp();
    await addNote(user, 'Mover');
    await user.click(screen.getByRole('button', { name: 'Collapse, column “To do”' }));
    const handle = notesList().getByRole('button', { name: 'Drag, note “Mover”' });
    handle.focus();
    await user.keyboard(' {ArrowRight}');
    expect(column('To do').getByText('Drop here: end of To do')).toBeInTheDocument();
    expect(screen.getByText('Moving to To do (collapsed), position 1 of 1. Space to drop, Escape to cancel.')).toBeInTheDocument();
    await user.keyboard(' ');
    await waitFor(() => expect(column('To do').getByRole('heading', { level: 3 })).toHaveTextContent('(1 note)'));
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';

export function renderApp() {
  const user = userEvent.setup();
  const utils = render(<App />);
  return { user, ...utils };
}

export async function addNote(user: ReturnType<typeof userEvent.setup>, title: string, extra: { description?: string; tags?: string } = {}) {
  const form = within(screen.getByRole('region', { name: 'New note' }));
  await user.type(form.getByLabelText(/^Title/), title);
  if (extra.description) await user.type(form.getByLabelText('Description'), extra.description);
  if (extra.tags) await user.type(form.getByLabelText('Tags'), extra.tags);
  await user.click(form.getByRole('button', { name: 'Add note' }));
}

export function notesList() {
  return within(screen.getByRole('region', { name: 'Notes' }));
}

export function column(name: string) {
  return within(screen.getByRole('region', { name: new RegExp(`^${name}`) }));
}

/** Text written to all live regions (page and dialogs). */
export function announcements(): string {
  return [...document.querySelectorAll('[role="status"], [role="alert"]')].map((el) => el.textContent).join(' | ');
}

export async function waitForAnnouncement(text: string | RegExp) {
  await waitFor(() => expect(announcements()).toMatch(text));
}

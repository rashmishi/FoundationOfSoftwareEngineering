import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';

export type User = ReturnType<typeof userEvent.setup>;

export function renderApp() {
  const user = userEvent.setup();
  const utils = render(<App />);
  return { user, ...utils };
}

export const createForm = () => within(screen.getByRole('form', { name: 'Create note' }));

export async function createNote(user: User, title: string, description = '', tags = '') {
  const form = createForm();
  if (title) await user.type(form.getByRole('textbox', { name: /^Title/ }), title);
  if (description) await user.type(form.getByRole('textbox', { name: 'Description' }), description);
  if (tags) await user.type(form.getByRole('textbox', { name: 'Tags' }), tags);
  await user.click(form.getByRole('button', { name: 'Create note' }));
}

export const notesList = () => within(screen.getByRole('list', { name: 'Notes' }));

/** The board column whose heading is `name`. */
export const boardColumn = (name: string) => {
  const columns = screen.getByRole('list', { name: 'Board columns' });
  const heading = within(columns).getByRole('heading', { level: 3, name });
  return within(heading.closest('li') as HTMLElement);
};

/** The app's own status region (dnd-kit adds a hidden one of its own). */
export const statusText = () => document.querySelector('.messages [role="status"]')?.textContent ?? '';
export const alertText = () =>
  Array.from(document.querySelectorAll('.messages [role="alert"]'))
    .map((el) => el.textContent)
    .join(' ');

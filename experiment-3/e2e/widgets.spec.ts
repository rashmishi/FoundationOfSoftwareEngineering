import { expect, test } from '@playwright/test';
import { addNote, column, notes } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await addNote(page, 'Widget');
});

test('menu button: keyboard opens, arrows move, Escape returns focus', async ({ page }) => {
  const button = notes(page).getByRole('button', { name: 'More actions, note “Widget”' });
  await button.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
  // Reopen with ArrowUp lands on the last item; Enter on Rename opens the inline editor.
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Note title')).toBeFocused();
  await page.keyboard.press('Escape');
});

test('tooltip shows on focus and hover, and Escape hides it without moving focus', async ({ page }) => {
  const edit = notes(page).getByRole('button', { name: 'Edit, note “Widget”' });
  await notes(page).getByRole('button', { name: 'Widget', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(edit).toBeFocused();
  const tip = page.locator('.tooltip:popover-open');
  await expect(tip).toHaveText('Edit');
  await page.keyboard.press('Escape');
  await expect(tip).toHaveCount(0);
  await expect(edit).toBeFocused();
  // Hover: tooltip appears and stays while the pointer moves onto it.
  await page.getByRole('heading', { level: 1 }).focus();
  await edit.hover();
  await expect(page.locator('.tooltip:popover-open')).toHaveText('Edit');
  const box = (await page.locator('.tooltip:popover-open').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
  await page.waitForTimeout(400);
  await expect(page.locator('.tooltip:popover-open')).toHaveText('Edit');
});

test('dialog traps focus, Escape closes, focus returns', async ({ page }) => {
  const move = notes(page).getByRole('button', { name: 'Move to…, note “Widget”' });
  await move.click();
  const dialog = page.getByRole('dialog', { name: 'Move note' });
  await expect(dialog.getByLabel('Column')).toBeFocused();
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => !!document.activeElement?.closest('dialog'));
  expect(inside).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(move).toBeFocused();
});

test('toast pauses while hovered and Undo from the header works after it closes', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Keep notifications for').selectOption('5');
  await page.getByRole('button', { name: 'Close' }).click();
  await notes(page).getByRole('button', { name: 'Delete, note “Widget”' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete note' }).click();
  const toast = page.locator('.toast', { hasText: 'Note “Widget” deleted.' });
  await toast.hover();
  await page.waitForTimeout(6000);
  await expect(toast).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(toast).toBeHidden({ timeout: 8000 });
  await page.getByRole('button', { name: 'Undo, delete note “Widget”' }).click();
  await expect(notes(page).getByRole('article', { name: 'Widget' })).toBeVisible();
});

test('collapsed column still accepts a moved note', async ({ page }) => {
  await page.getByRole('button', { name: 'Collapse, column “Done”' }).click();
  await notes(page).getByRole('button', { name: 'Move to…, note “Widget”' }).click();
  await page.getByRole('dialog').getByLabel('Column', { exact: true }).selectOption({ label: 'Done' });
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await expect(column(page, 'Done').getByRole('heading', { level: 3 })).toContainText('(1 note)');
});

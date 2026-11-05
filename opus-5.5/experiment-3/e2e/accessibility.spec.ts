import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addNote, column, contrast, drag, notes } from './helpers';

async function seed(page: import('@playwright/test').Page) {
  await page.goto('/');
  await addNote(page, 'Overdue thing', 'work, home, urgent');
  await page.getByRole('region', { name: 'Notes', exact: true }).getByRole('button', { name: 'Edit, note “Overdue thing”' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit note' });
  await dialog.getByLabel('Priority').selectOption('high');
  await dialog.getByLabel('Due date').fill('2020-01-01');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await addNote(page, 'Second', 'ideas');
  const d = await drag(page, notes(page).getByRole('article', { name: 'Overdue thing' }), column(page, 'To do'));
  await d.drop();
  await expect(column(page, 'To do').getByRole('article', { name: 'Overdue thing' })).toBeVisible();
}

for (const theme of ['light', 'dark'] as const) {
  test(`axe finds no violations (including contrast) in the ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await seed(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);

    await column(page, 'To do').getByRole('button', { name: 'More actions, note “Overdue thing”' }).click();
    const withMenu = await new AxeBuilder({ page }).analyze();
    expect(withMenu.violations.map((v) => v.id)).toEqual([]);
  });

  test(`faded toolbar icons keep at least 3:1 as rendered (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await seed(page);
    await page.mouse.move(0, 0);
    await page.getByRole('heading', { level: 1 }).focus();
    const card = notes(page).getByRole('article', { name: 'Second' });
    const [icon, bg] = await card.evaluate((el) => {
      const toolbar = el.querySelector('.toolbar')!;
      return [getComputedStyle(toolbar).color, getComputedStyle(el).backgroundColor];
    });
    expect(contrast(icon, bg)).toBeGreaterThanOrEqual(3);
    // Focus colour against the page.
    const ring = await card.getByRole('button', { name: 'Edit, note “Second”' }).evaluate((b) => {
      (b as HTMLElement).focus();
      return getComputedStyle(b).outlineColor;
    });
    expect(contrast(ring, bg)).toBeGreaterThanOrEqual(3);
  });
}

test('the menu on the last card of a column is not clipped by the board region', async ({ page }) => {
  await seed(page);
  const button = column(page, 'To do').getByRole('button', { name: 'More actions, note “Overdue thing”' });
  await button.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  // The menu's centre is the topmost element there (nothing covers or clips it).
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[role="menu"]') !== null, [box.x + box.width / 2, box.y + box.height / 2]);
  expect(hit).toBe(true);
});

test('reflows at 320 px wide without horizontal page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await seed(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('forced colours keep borders and focus visible', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await seed(page);
  const edit = notes(page).getByRole('button', { name: 'Edit, note “Second”' });
  await notes(page).getByRole('button', { name: 'Second', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(edit).toBeFocused();
  await expect(edit).toHaveCSS('outline-style', 'solid');
  await expect(column(page, 'To do')).toHaveCSS('border-top-style', 'solid');
});

test('reduced motion removes movement animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page);
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');
  const name = await notes(page).getByRole('article').first().evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe('fade-in');
  await expect(page.locator('.toast-progress')).toHaveCount(0);
});

test('text spacing override does not clip chips or titles', async ({ page }) => {
  await seed(page);
  await page.addStyleTag({
    content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  });
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('.chip, .badge, .title-button, .column-title')].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).length,
  );
  expect(clipped).toBe(0);
});

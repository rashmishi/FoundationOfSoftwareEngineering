import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addNote, card, column, dragToColumn, noteList, useTheme, type Theme } from './helpers';

const THEMES: Theme[] = ['light', 'dark', 'contrast'];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoAxeViolations(page: Page) {
  const { violations, incomplete } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  // Incomplete results are elements axe could not judge, which are not passes.
  const problems = [...violations, ...incomplete].flatMap(({ id, nodes }) =>
    nodes.map(({ target, any, all, none }) => ({
      id,
      target,
      reasons: [...any, ...all, ...none].map((check) => check.message),
    })),
  );
  const unresolved = [];
  for (const problem of problems) {
    if (!(await isOverlayTextOverPage(page, problem))) unresolved.push(problem);
  }
  expect(unresolved).toEqual([]);
}

/**
 * Axe cannot find the background of text in a layer floating over the page. That
 * text is measured directly by the "text in overlays" test below. Anywhere else,
 * an overlap means that something really is covering the text.
 */
async function isOverlayTextOverPage(page: Page, problem: { id: string; target: unknown; reasons: string[] }) {
  const [selector] = problem.target as string[];
  return (
    problem.id === 'color-contrast' &&
    problem.reasons.every((reason) => reason.includes('partially overlaps')) &&
    (await page.locator(selector).first().evaluate((element) => !!element.closest('.status-bar, dialog')))
  );
}

/** The WCAG contrast ratio of an element's text against its layer's opaque background. */
async function overlayTextContrast(page: Page, selector: string): Promise<number> {
  const [text, background] = await page.locator(selector).evaluate((element) => {
    const { color, backgroundColor } = getComputedStyle(element);
    return [color, backgroundColor];
  });
  const luminance = (color: string) => {
    const [red, green, blue, alpha = 1] = color.match(/[\d.]+/g)!.map(Number);
    expect(alpha).toBe(1);
    const [r, g, b] = [red, green, blue].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [lighter, darker] = [luminance(text), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

async function addSampleNotes(page: Page) {
  await addNote(page, { title: 'On the board', description: 'Has a column', tags: 'alpha, beta' });
  await addNote(page, { title: 'In the list', description: 'No column' });
  await page.getByRole('combobox', { name: 'Column for On the board' }).selectOption({ label: 'To do' });
  await page.getByRole('button', { name: 'Move On the board' }).click();
  await expect(card(column(page, 'To do'), 'On the board')).toBeVisible();
}

const SCREEN_STATES: Record<string, (page: Page) => Promise<void>> = {
  'empty app': async () => {},
  'notes on the board with a success message': addSampleNotes,
  'form errors': async (page) => {
    await page.getByRole('button', { name: 'Add note' }).click();
    await page.getByRole('button', { name: 'Add column' }).click();
    await expect(page.getByText('Enter a name for the column.')).toBeVisible();
  },
  'an import error message': async (page) => {
    await page.getByTestId('import-file').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('nope'),
    });
    await expect(page.getByRole('alert').filter({ hasText: 'not imported' })).toBeVisible();
  },
  'the edit dialog': async (page) => {
    await addSampleNotes(page);
    await page.getByRole('button', { name: 'Edit In the list' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  },
  'the delete dialog': async (page) => {
    await addSampleNotes(page);
    await page.getByRole('button', { name: 'Delete In the list' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
  },
  'a note being dragged': async (page) => {
    await addSampleNotes(page);
    const source = card(noteList(page), 'In the list');
    const box = (await source.boundingBox())!;
    await page.mouse.move(box.x + 24, box.y + 16);
    await page.mouse.down();
    await page.mouse.move(box.x + 60, box.y + 60, { steps: 5 });
    await expect(source).toHaveCSS('outline-style', 'dashed');
  },
  'a note picked up with the keyboard': async (page) => {
    await addSampleNotes(page);
    await page.getByRole('button', { name: 'Pick up In the list' }).click();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toContainText('Over To do');
  },
  'a search with no results': async (page) => {
    await addSampleNotes(page);
    await page.getByLabel('Search notes').fill('nothing matches this');
    await expect(page.getByText('No notes match your search.')).toBeVisible();
  },
  'the unsaved changes prompt': async (page) => {
    await addSampleNotes(page);
    await page.getByRole('button', { name: 'Edit In the list' }).click();
    await page.getByRole('dialog').getByLabel('Title').fill('Changed');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  },
  'display settings': async (page) => {
    await page.getByRole('button', { name: 'Display settings' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  },
  'help': async (page) => {
    await page.getByRole('button', { name: 'Help' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  },
};

for (const theme of THEMES) {
  for (const [name, reach] of Object.entries(SCREEN_STATES)) {
    test(`axe finds no violations: ${name} (${theme})`, async ({ page }) => {
      await useTheme(page, theme);
      await page.goto('/');
      await reach(page);
      await expectNoAxeViolations(page);
    });
  }
}

for (const theme of THEMES) {
  test(`text in overlays meets 4.5:1 on an opaque background (${theme})`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto('/');
    await addNote(page, { title: 'Overlay' });
    expect(await overlayTextContrast(page, '.status-bar-success')).toBeGreaterThanOrEqual(4.5);

    await SCREEN_STATES['an import error message'](page);
    expect(await overlayTextContrast(page, '.status-bar-error')).toBeGreaterThanOrEqual(4.5);

    await page.getByRole('button', { name: 'Delete Overlay' }).click();
    expect(await overlayTextContrast(page, 'dialog')).toBeGreaterThanOrEqual(4.5);
  });
}

test('axe is able to fail: an injected contrast problem is reported', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({ content: '.app-header p { color: #dddddd !important; }' });
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(violations.map(({ id }) => id)).toContain('color-contrast');
});

test('axe finds no violations at 320px wide', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await addSampleNotes(page);
  await expectNoAxeViolations(page);
});

test.describe('reflow', () => {
  async function pageScrollsSideways(page: Page) {
    return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  }

  test('nothing scrolls sideways at 320 x 256, even with long content', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto('/');
    await addSampleNotes(page);
    await addNote(page, { title: 'Unbroken'.repeat(12), description: 'x'.repeat(200), tags: 'y'.repeat(100) });

    expect(await pageScrollsSideways(page)).toBe(false);
  });

  test('the dialog fits and scrolls at 320 x 256', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto('/');
    await addSampleNotes(page);
    await page.getByRole('button', { name: 'Edit In the list' }).click();

    const dialog = page.getByRole('dialog');
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    await dialog.getByRole('button', { name: 'Save changes' }).focus();
    await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeInViewport();
  });

  test('WCAG 1.4.12 text spacing causes no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await addSampleNotes(page);
    await page.addStyleTag({
      content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`,
    });

    expect(await pageScrollsSideways(page)).toBe(false);
  });
});

test('interactive targets are at least 24 x 24 px (WCAG 2.5.8)', async ({ page }) => {
  await page.goto('/');
  await addSampleNotes(page);

  const undersized = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a, button, input:not([hidden]), select, textarea')]
      .filter((element) => {
        const { width, height } = element.getBoundingClientRect();
        return width < 24 || height < 24;
      })
      .map((element) => element.outerHTML),
  );
  expect(undersized).toEqual([]);
});

test.describe('keyboard', () => {
  test('the first Tab stops are skip links that work', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to add a note' })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Skip to add a note' })).toBeInViewport();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to notes' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to board' })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Skip to board' })).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Board', exact: true })).toBeFocused();
  });

  test('a note can be created, moved, edited and deleted with only the keyboard', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('region', { name: 'Add a note' }).getByLabel('Title').focus();
    await page.keyboard.type('Keyboard note');
    await page.keyboard.press('Enter');
    await expect(card(noteList(page), 'Keyboard note')).toBeVisible();

    // Browsing the options must not move the note until Move is pressed (WCAG 3.2.2).
    const select = page.getByRole('combobox', { name: 'Column for Keyboard note' });
    await select.focus();
    await page.keyboard.press('ArrowDown');
    await expect(select).toHaveValue('todo');
    await expect(card(column(page, 'To do'), 'Keyboard note')).toHaveCount(0);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Move Keyboard note' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(card(column(page, 'To do'), 'Keyboard note')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Edit Keyboard note' }).first()).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.type(' edited');
    await page.keyboard.press('Enter');
    await expect(card(noteList(page), 'Keyboard note edited')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Delete Keyboard note edited' }).first()).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(noteList(page).locator('article')).toHaveCount(0);
  });

  test('Esc closes a dialog and no focus reaches the page behind it', async ({ page }) => {
    await page.goto('/');
    await addNote(page, { title: 'Contained' });
    await page.getByRole('button', { name: 'Edit Contained' }).click();

    const dialog = page.getByRole('dialog');
    for (let press = 0; press < 12; press++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !document.activeElement?.closest('main, nav'))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test.describe('focus management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await addSampleNotes(page);
  });

  test('the edit dialog opens on the title and returns focus to the opener', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit In the list' }).click();
    await expect(page.getByRole('dialog').getByLabel('Title')).toBeFocused();

    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Edit In the list' })).toBeFocused();
  });

  test('the delete dialog opens on Cancel', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete In the list' }).click();
    await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' })).toBeFocused();
  });

  test('deleting moves focus to the heading of the section', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete In the list' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();
    await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeFocused();

    await card(column(page, 'To do'), 'On the board').getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();
    await expect(page.getByRole('heading', { name: 'Board', exact: true })).toBeFocused();
  });

  test('moving a card between columns keeps focus on that card', async ({ page }) => {
    const board = page.getByRole('region', { name: 'Board' });
    await board.getByRole('combobox', { name: 'Column for On the board' }).selectOption({ label: 'Done' });
    await board.getByRole('button', { name: 'Move On the board' }).click();

    await expect(card(column(page, 'Done'), 'On the board').getByRole('button', { name: /^Move/ })).toBeFocused();
  });

  test('taking a card off the board moves focus to its list entry', async ({ page }) => {
    const board = page.getByRole('region', { name: 'Board' });
    await board.getByRole('combobox', { name: 'Column for On the board' }).selectOption({ label: 'Not on board' });
    await board.getByRole('button', { name: 'Move On the board' }).click();

    await expect(card(noteList(page), 'On the board').getByRole('button', { name: /^Move/ })).toBeFocused();
  });

  test('the note form returns focus to the title after adding a note', async ({ page }) => {
    await addNote(page, { title: 'Next' });
    await expect(page.getByRole('region', { name: 'Add a note' }).getByLabel('Title')).toBeFocused();
  });

  test('an invalid form moves focus to the title and links the error to it', async ({ page }) => {
    const title = page.getByRole('region', { name: 'Add a note' }).getByLabel('Title');
    await page.getByRole('button', { name: 'Add note' }).click();

    await expect(title).toBeFocused();
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(title).toHaveAccessibleDescription(/Enter a title for the note/);
  });

  test('dismissing a message leaves focus on the page title', async ({ page }) => {
    await page.getByRole('button', { name: 'Dismiss message' }).click();
    await expect(page.getByRole('heading', { name: 'Notes Board' })).toBeFocused();
  });
});

for (const [size, viewport] of Object.entries({
  desktop: { width: 1280, height: 720 },
  'small screen': { width: 320, height: 568 },
})) {
  test(`the status bar never fully hides the focused element: ${size} (WCAG 2.4.11)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await addSampleNotes(page);
    await addNote(page, { title: 'Third', description: 'Extra height' });

    const focusableCount = await page.locator('a, button, input:not([hidden]), select, textarea').count();
    for (let press = 0; press < focusableCount; press++) {
      await page.keyboard.press('Tab');
      const hidden = await page.evaluate(() => {
        const focused = document.activeElement as HTMLElement;
        const bar = document.querySelector('.status-bar')!;
        const area = focused.getBoundingClientRect();
        const cover = bar.getBoundingClientRect();
        const covered =
          !bar.contains(focused) &&
          area.top >= cover.top &&
          area.bottom <= cover.bottom &&
          area.left >= cover.left &&
          area.right <= cover.right;
        return covered ? focused.outerHTML : null;
      });
      expect(hidden).toBeNull();
    }
  });
}

test('the page has a title and language', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Notes Board');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('a drag is announced through the status region', async ({ page }) => {
  await page.goto('/');
  await addNote(page, { title: 'Announced drag' });
  await dragToColumn(page, card(noteList(page), 'Announced drag'), 'Done');
  await expect(page.getByRole('status')).toHaveText('Moved "Announced drag" to Done.');
});

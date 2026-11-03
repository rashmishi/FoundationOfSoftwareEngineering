import { expect, type Locator, type Page } from '@playwright/test';

export async function addNote(page: Page, title: string, tags = '') {
  const form = page.getByRole('region', { name: 'New note' });
  await form.getByLabel(/^Title/).fill(title);
  if (tags) await form.getByLabel('Tags').fill(tags);
  await form.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('region', { name: 'Notes' }).getByRole('article', { name: title })).toBeVisible();
}

export const notes = (page: Page) => page.getByRole('region', { name: 'Notes', exact: true });
export const column = (page: Page, name: string) => page.getByRole('region', { name: new RegExp(`^${name} \\(`) });

/** Pointer drag in small steps, as a person would (dnd-kit needs real movement). */
export async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }) {
  await from.scrollIntoViewIfNeeded();
  const a = (await from.boundingBox())!;
  const b = 'x' in to ? { x: to.x, y: to.y, width: 0, height: 0 } : (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + 12);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + 20, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 60), { steps: 15 });
  return {
    drop: async () => {
      await page.mouse.up();
    },
  };
}

export function luminance(rgb: string): number {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

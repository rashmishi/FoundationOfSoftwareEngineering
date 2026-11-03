import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TAG_COLOURS } from '../model/tags';

const css = readFileSync(resolve(__dirname, '../styles/tokens.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const tokens: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)) tokens[m[1]] = m[2];
  return tokens;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = { light: block(":root[data-theme='light']"), dark: block(":root[data-theme='dark']") };

// [foreground, background, minimum]
const TEXT = 4.5;
const UI = 3;
const pairs: [string, string, number][] = [
  ['text', 'surface', TEXT], ['text', 'bg', TEXT], ['text', 'column-bg', TEXT],
  ['muted', 'surface', TEXT], ['muted', 'bg', TEXT], ['muted', 'column-bg', TEXT],
  ['danger', 'surface', TEXT], ['danger', 'bg', TEXT], ['danger', 'column-bg', TEXT],
  ['on-accent', 'accent', TEXT], ['on-accent', 'accent-hover', TEXT], ['on-danger', 'danger', TEXT],
  ['text', 'drop-bg', TEXT], ['success', 'surface', UI], ['info', 'surface', UI],
  ['border', 'surface', UI], ['border', 'bg', UI], ['border', 'column-bg', UI],
  ['focus', 'surface', UI], ['focus', 'bg', UI], ['focus', 'column-bg', UI], ['focus', 'drop-bg', UI],
  ['toolbar-faded', 'surface', UI],
  ['accent', 'surface', UI],
  ...(['low', 'medium', 'high'] as const).flatMap((p): [string, string, number][] => [
    [`prio-${p}-fg`, `prio-${p}-bg`, TEXT],
    [`prio-${p}-fg`, 'surface', UI],
  ]),
  ...TAG_COLOURS.flatMap((c): [string, string, number][] => [
    [`tag-${c}-fg`, `tag-${c}-bg`, TEXT],
    [`tag-${c}-fg`, 'surface', UI],
  ]),
];

describe.each(Object.entries(themes))('%s theme contrast', (_, tokens) => {
  it.each(pairs)('%s on %s ≥ %s:1', (fg, bg, min) => {
    expect(tokens[fg], `missing --${fg}`).toBeDefined();
    expect(tokens[bg], `missing --${bg}`).toBeDefined();
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
  });
});

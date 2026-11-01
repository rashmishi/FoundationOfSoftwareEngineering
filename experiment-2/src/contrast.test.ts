import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * axe checks text contrast but not WCAG 1.4.11, so non-text contrast is checked
 * here directly from the design tokens.
 */
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

function readTokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map((match) => [match[1], match[2]]));
}

const [lightBlock, afterLight] = css.split(":root[data-theme='dark'] {");
const [darkBlock, afterDark] = afterLight.split(":root[data-theme='contrast'] {");
const contrastBlock = afterDark.split(':root[data-text-size')[0];
const themes = {
  light: readTokens(lightBlock),
  dark: readTokens(darkBlock),
  contrast: readTokens(contrastBlock),
};

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const BACKGROUNDS = ['bg', 'surface', 'surface-sunken'];

describe.each(Object.entries(themes))('%s theme', (_name, tokens) => {
  it.each(['text', 'text-muted', 'primary', 'danger', 'success'])('%s text meets 4.5:1', (token) => {
    for (const background of BACKGROUNDS) {
      expect(contrast(tokens[token], tokens[background])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(['control-border', 'focus', 'primary', 'text-muted'])('%s meets 3:1 as a non-text colour', (token) => {
    for (const background of BACKGROUNDS) {
      expect(contrast(tokens[token], tokens[background])).toBeGreaterThanOrEqual(3);
    }
  });

  it('primary button text meets 4.5:1', () => {
    expect(contrast(tokens['on-primary'], tokens.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('tag text meets 4.5:1', () => {
    expect(contrast(tokens['tag-text'], tokens['tag-bg'])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['text', 'text-muted'])('%s meets 4.5:1 on a card being dragged', (token) => {
    expect(contrast(tokens[token], tokens['tag-bg'])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('high contrast theme', () => {
  it.each(['text', 'text-muted', 'primary', 'danger', 'success', 'tag-text'])('%s meets 7:1', (token) => {
    expect(contrast(themes.contrast[token], themes.contrast.surface)).toBeGreaterThanOrEqual(7);
  });

  it('primary button text meets 7:1', () => {
    expect(contrast(themes.contrast['on-primary'], themes.contrast.primary)).toBeGreaterThanOrEqual(7);
  });
});

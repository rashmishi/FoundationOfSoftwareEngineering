import { describe, expect, it } from 'vitest';
import { TAG_COLOR_COUNT, tagClass, tagColorIndex } from './colors';

describe('tag colours', () => {
  it('is stable and ignores case and surrounding space', () => {
    expect(tagColorIndex('Work')).toBe(tagColorIndex(' work '));
    expect(tagClass('work')).toBe(`tag tag-color-${tagColorIndex('work')}`);
  });

  it('stays within the palette and spreads tags out', () => {
    const tags = ['work', 'home', 'urgent', 'uni', 'dev', 'ops', 'ideas', 'later', 'bug', 'design'];
    const indices = tags.map(tagColorIndex);
    expect(indices.every((i) => i >= 0 && i < TAG_COLOR_COUNT)).toBe(true);
    expect(new Set(indices).size).toBeGreaterThan(3);
  });
});

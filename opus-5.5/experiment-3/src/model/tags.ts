export const TAG_COLOURS = ['blue', 'green', 'purple', 'orange', 'teal', 'pink', 'gray', 'yellow'] as const;
export type TagColour = (typeof TAG_COLOURS)[number];

/** Split comma-separated tag text: trim, drop empty entries and case-insensitive duplicates (FR-1.2). */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of text.split(',')) {
    const tag = raw.trim().replace(/\s+/g, ' ');
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

/** The same tag text always gets the same colour (FR-8.2). */
export function tagColour(tag: string): TagColour {
  let hash = 0;
  for (const ch of tag.toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return TAG_COLOURS[hash % TAG_COLOURS.length];
}

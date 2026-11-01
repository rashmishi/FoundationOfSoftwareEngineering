/** Turns "work, urgent,, Work " into ["work", "urgent"] (FR-1.2). */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(',')) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

export function formatTags(tags: string[]): string {
  return tags.join(', ');
}

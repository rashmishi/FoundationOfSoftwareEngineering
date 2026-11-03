export const TAG_COLOR_COUNT = 8;

/** A stable palette slot for a tag, so the same tag always gets the same colour. */
export function tagColorIndex(tag: string): number {
  let hash = 0x811c9dc5;
  for (const ch of tag.trim().toLowerCase()) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % TAG_COLOR_COUNT;
}

export function tagClass(tag: string): string {
  return `tag tag-color-${tagColorIndex(tag)}`;
}

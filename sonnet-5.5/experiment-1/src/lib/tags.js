// Each tag name maps to a stable hue, so the same tag always has the same colour.
// Saturation and lightness are fixed in the stylesheet, which keeps every hue readable.
export function tagHue(tag) {
  let h = 0;
  const s = tag.toLowerCase();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 12) * 30 + 8; // 12 well-separated hues
}

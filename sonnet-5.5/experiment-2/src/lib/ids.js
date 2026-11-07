// crypto.randomUUID only exists in secure contexts, and the Docker image is often
// served over plain http on a LAN address, so use getRandomValues with a fallback.
export function newId(prefix = 'id') {
  let hex = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    hex = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
  }
  return `${prefix}-${hex}`;
}

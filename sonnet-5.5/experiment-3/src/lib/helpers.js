export const STORAGE_KEY = 'notes-kanban:v1';
export const PREFS_KEY = 'notes-kanban:prefs';

export const PRIORITIES = ['low', 'medium', 'high'];
export const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

export function uid(prefix = 'n') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

const pad = (n) => String(n).padStart(2, '0');

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isOverdue(due, today = todayISO()) {
  return Boolean(due) && due < today;
}

export function formatDue(due) {
  const [y, m, d] = due.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Turns "work, Home ,work" into ["work", "home"]: trimmed, lower-case, no duplicates. */
export function parseTags(text) {
  const seen = new Set();
  const tags = [];
  for (const part of String(text || '').split(',')) {
    const tag = part.trim().toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

/** Stable colour for a tag, derived from its text. */
export function tagHue(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) % 360;
  return hash;
}

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be full or blocked; the app keeps working in memory */
  }
}

let audio;
const SOUNDS = {
  add: [[523, 0.09], [784, 0.12]],
  delete: [[330, 0.09], [196, 0.14]],
  drop: [[440, 0.07]],
  undo: [[392, 0.07], [523, 0.07]],
  error: [[160, 0.18]],
  info: [[600, 0.06]],
};

export function playSound(kind, enabled) {
  if (!enabled) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    let start = audio.currentTime;
    for (const [freq, length] of SOUNDS[kind] || SOUNDS.info) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = kind === 'error' ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + length + 0.02);
      start += length;
    }
  } catch {
    /* audio is optional */
  }
}

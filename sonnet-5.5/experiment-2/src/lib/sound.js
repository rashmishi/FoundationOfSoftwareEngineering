// Short synthesised sound effects (no audio files). Off by default; the person turns them on with
// the "Sound effects" switch. Every sound only repeats something that is also shown as text
// (a notification), so nothing depends on being able to hear.

let enabled = false;
let ctx = null;

export function setSoundEnabled(value) {
  enabled = !!value;
}

function context() {
  if (ctx) return ctx;
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(c, { freq, start = 0, duration = 0.12, type = 'sine', gain = 0.07, endFreq }) {
  const osc = c.createOscillator();
  const amp = c.createGain();
  const t0 = c.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

const SOUNDS = {
  add: (c) => {
    tone(c, { freq: 523, duration: 0.1 });
    tone(c, { freq: 784, start: 0.09, duration: 0.16 });
  },
  delete: (c) => tone(c, { freq: 440, endFreq: 196, duration: 0.22, type: 'triangle' }),
  move: (c) => tone(c, { freq: 660, endFreq: 520, duration: 0.09, type: 'triangle', gain: 0.06 }),
  undo: (c) => {
    tone(c, { freq: 520, duration: 0.08 });
    tone(c, { freq: 390, start: 0.08, duration: 0.12 });
  },
  error: (c) => {
    tone(c, { freq: 180, duration: 0.14, type: 'square', gain: 0.04 });
    tone(c, { freq: 150, start: 0.15, duration: 0.18, type: 'square', gain: 0.04 });
  },
  toggle: (c) => tone(c, { freq: 700, duration: 0.07, gain: 0.05 }),
  pick: (c) => tone(c, { freq: 600, duration: 0.05, type: 'triangle', gain: 0.04 }),
};

export function playSound(name, { force = false } = {}) {
  if (!enabled && !force) return;
  const play = SOUNDS[name];
  const c = context();
  if (!play || !c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try {
    play(c);
  } catch {
    /* audio is a nicety; never let it break the app */
  }
}

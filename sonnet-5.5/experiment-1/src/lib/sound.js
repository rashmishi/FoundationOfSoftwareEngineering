// Small synthesised sound effects (Web Audio), so no audio files are shipped.
// Browsers only allow audio after a user gesture, which is always the case here
// because every sound is triggered by a click, key press or drop.

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
}

function context() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// notes: [frequency Hz, start offset s, duration s]
const SOUNDS = {
  create: { type: 'sine', notes: [[523, 0, 0.12], [784, 0.09, 0.2]] },
  save: { type: 'sine', notes: [[660, 0, 0.14]] },
  delete: { type: 'triangle', notes: [[392, 0, 0.12], [262, 0.1, 0.22]] },
  move: { type: 'sine', notes: [[440, 0, 0.07], [587, 0.05, 0.1]] },
  undo: { type: 'sine', notes: [[587, 0, 0.1], [440, 0.08, 0.16]] },
  error: { type: 'square', notes: [[196, 0, 0.18], [185, 0.16, 0.22]], gain: 0.05 },
  toggle: { type: 'sine', notes: [[600, 0, 0.06]] },
};

export function playSound(name) {
  if (!enabled) return;
  const spec = SOUNDS[name];
  const ac = spec && context();
  if (!ac) return;
  const peak = spec.gain ?? 0.12;
  const t0 = ac.currentTime;
  for (const [freq, offset, dur] of spec.notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = spec.type;
    osc.frequency.value = freq;
    // A quick fade in and out avoids clicks.
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + dur + 0.02);
  }
}

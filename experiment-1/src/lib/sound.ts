export type SoundName = 'create' | 'delete' | 'drop' | 'pick' | 'undo' | 'error' | 'toggle';

let context: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

interface Tone {
  freq: number;
  /** Frequency at the end of the tone, for slides. */
  to?: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

const SOUNDS: Record<SoundName, Tone[]> = {
  create: [
    { freq: 660, start: 0, duration: 0.09, type: 'triangle' },
    { freq: 990, start: 0.08, duration: 0.14, type: 'triangle' },
  ],
  delete: [{ freq: 420, to: 180, start: 0, duration: 0.2, type: 'sine', gain: 0.22 }],
  drop: [{ freq: 300, to: 520, start: 0, duration: 0.07, type: 'sine', gain: 0.2 }],
  pick: [{ freq: 520, start: 0, duration: 0.04, type: 'sine', gain: 0.1 }],
  undo: [
    { freq: 880, start: 0, duration: 0.07, type: 'triangle' },
    { freq: 587, start: 0.07, duration: 0.12, type: 'triangle' },
  ],
  error: [
    { freq: 160, start: 0, duration: 0.12, type: 'square', gain: 0.07 },
    { freq: 130, start: 0.13, duration: 0.16, type: 'square', gain: 0.07 },
  ],
  toggle: [{ freq: 740, start: 0, duration: 0.05, type: 'sine', gain: 0.12 }],
};

/** Plays a short synthesised effect. Always called from a user gesture, so the AudioContext may start. */
export function playSound(name: SoundName): void {
  if (!enabled || typeof AudioContext === 'undefined') return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const t0 = context.currentTime;
    for (const tone of SOUNDS[name]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = t0 + tone.start;
      const end = start + tone.duration;
      osc.type = tone.type ?? 'sine';
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.16, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(context.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // Audio is optional; never let it break an action.
  }
}

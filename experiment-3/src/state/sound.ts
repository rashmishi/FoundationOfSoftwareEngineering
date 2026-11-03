export type SoundName = 'create' | 'drop' | 'delete' | 'undo' | 'error';

// [frequency at start, frequency at end, duration in ms]. All well under 0.5 s (FR-19.1).
const TONES: Record<SoundName, [number, number, number]> = {
  create: [660, 880, 120],
  drop: [440, 440, 80],
  delete: [330, 220, 150],
  undo: [523, 659, 120],
  error: [220, 220, 200],
};

const VOLUME = 0.04; // quiet, so speech output is not drowned out (FR-19.4)

let context: AudioContext | null = null;

export function playTone(name: SoundName): void {
  const Ctx = typeof window !== 'undefined' ? window.AudioContext : undefined;
  if (!Ctx) return;
  try {
    context ??= new Ctx();
    const [from, to, ms] = TONES[name];
    const start = context.currentTime;
    const end = start + ms / 1000;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.linearRampToValueAtTime(to, end);
    // 10 ms fade in and out avoids clicks.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(VOLUME, start + 0.01);
    gain.gain.setValueAtTime(VOLUME, end - 0.01);
    gain.gain.linearRampToValueAtTime(0, end);
    osc.connect(gain).connect(context.destination);
    osc.start(start);
    osc.stop(end);
  } catch {
    // Sound is optional; never let it break an action.
  }
}

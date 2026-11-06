/**
 * Short tones made with the Web Audio API, so there are no audio files to load.
 * Each sound lasts well under a second and always comes with a visible, announced
 * message, so sound is never the only way to learn what happened.
 */

export type SoundName = 'success' | 'info' | 'error';

/** Each note is a frequency in Hz and a start delay in seconds. */
const SOUNDS: Record<SoundName, [number, number][]> = {
  success: [
    [660, 0],
    [880, 0.09],
  ],
  info: [[587, 0]],
  error: [
    [330, 0],
    [247, 0.14],
  ],
};

const LEVELS: Record<string, number> = { off: 0, quiet: 0.03, normal: 0.09 };

let level = 0;
let context: AudioContext | null = null;

export function setSoundLevel(name: string): void {
  level = LEVELS[name] ?? 0;
}

export function playSound(name: SoundName): void {
  if (level === 0) return;
  try {
    context ??= new AudioContext();
    for (const [frequency, delay] of SOUNDS[name]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + delay;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(level, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.16);
    }
  } catch {
    // Sound is an extra. The message has already been shown and announced.
  }
}

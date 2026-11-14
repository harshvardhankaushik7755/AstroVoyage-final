/**
 * The sounds the game makes.
 *
 * There are no audio files. Every sound is built out of notes in
 * `data/sounds.json` by the browser's own oscillator, which keeps the whole
 * game one small download with nothing to wait for.
 *
 * Everything here is written to be safe to call at any time: before a player
 * has touched the page, with sound off, in a test with no AudioContext at all.
 * A sound that cannot be made is simply not made.
 */
import soundsJson from "./data/sounds.json";

export interface Note {
  freq: number;
  start: number;
  length: number;
  gain: number;
  /** Slide to this frequency over the note, for a whoosh or a sad fall. */
  sweepTo?: number;
}

export interface SoundConfig {
  masterGain: number;
  waveType: OscillatorType;
  sounds: Record<string, Note[]>;
}

export const soundConfig = soundsJson as unknown as SoundConfig;

export type SoundName = keyof typeof soundConfig.sounds | string;

let context: AudioContext | null = null;
let muted = true;

/** Turn sound on or off. Off is the default: nobody likes a page that shouts. */
export function setMutedForSound(value: boolean): void {
  muted = value;
}

export function isSoundMuted(): boolean {
  return muted;
}

/** The notes a named sound is made of, or an empty list if there is no such sound. */
export function notesFor(name: SoundName): Note[] {
  return soundConfig.sounds[name] ?? [];
}

/** How long a sound lasts, in seconds. The end of its last note. */
export function soundLength(name: SoundName): number {
  return notesFor(name).reduce((longest, note) => Math.max(longest, note.start + note.length), 0);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) {
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  // Browsers start the context suspended until the player interacts. Asking
  // again costs nothing and is what makes the first click audible.
  if (context.state === "suspended") void context.resume();
  return context;
}

/**
 * Play a sound by name. Does nothing when sound is off, when the browser has
 * no audio, or when the name is not one we know.
 */
export function playSound(name: SoundName): void {
  if (muted) return;
  const notes = notesFor(name);
  if (notes.length === 0) return;

  const ctx = audio();
  if (!ctx) return;

  const now = ctx.currentTime;
  for (const note of notes) {
    const oscillator = ctx.createOscillator();
    const level = ctx.createGain();

    oscillator.type = soundConfig.waveType;
    oscillator.frequency.setValueAtTime(note.freq, now + note.start);
    if (note.sweepTo !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, note.sweepTo),
        now + note.start + note.length,
      );
    }

    // A short fade in and out: a square-edged note clicks.
    const peak = note.gain * soundConfig.masterGain;
    level.gain.setValueAtTime(0.0001, now + note.start);
    level.gain.exponentialRampToValueAtTime(peak, now + note.start + 0.012);
    level.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.length);

    oscillator.connect(level);
    level.connect(ctx.destination);
    oscillator.start(now + note.start);
    oscillator.stop(now + note.start + note.length + 0.02);
  }
}

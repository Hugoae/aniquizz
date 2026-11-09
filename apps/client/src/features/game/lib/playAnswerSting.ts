import type { StageFeedbackKind } from '@/features/game/state/gameReducer';

/** Procedural stings (no assets): rising pair = found, arpeggio = streak prime, low buzz = wrong, soft drop = skip / missed. */
interface Note {
  freq: number;
  start: number;
  duration: number;
  type: OscillatorType;
}

const STINGS: Record<StageFeedbackKind, Note[]> = {
  correct: [
    { freq: 659, start: 0, duration: 0.09, type: 'sine' },
    { freq: 988, start: 0.07, duration: 0.14, type: 'sine' },
  ],
  bonus: [
    { freq: 523, start: 0, duration: 0.08, type: 'sine' },
    { freq: 659, start: 0.07, duration: 0.08, type: 'sine' },
    { freq: 1046, start: 0.14, duration: 0.2, type: 'triangle' },
  ],
  wrong: [{ freq: 150, start: 0, duration: 0.18, type: 'sawtooth' }],
  skip: [{ freq: 440, start: 0, duration: 0.12, type: 'triangle' }],
  missed: [
    { freq: 330, start: 0, duration: 0.1, type: 'triangle' },
    { freq: 247, start: 0.08, duration: 0.14, type: 'triangle' },
  ],
};

let ctx: AudioContext | null = null;

export function playAnswerSting(kind: StageFeedbackKind, volumePercent: number): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    const peak = Math.max(0.02, Math.min(0.12, (volumePercent / 100) * 0.12));
    const base = ctx.currentTime;
    for (const note of STINGS[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type;
      osc.frequency.value = note.freq;
      const at = base + note.start;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + note.duration + 0.02);
    }
  } catch {
    // Autoplay policy — the visual feedback still fires.
  }
}

// Synthesised sound effects. Each one is a tiny score for the chip voices.
import { noteFreq, type Voice } from './voice';

type Sound = (v: Voice, at: number) => void;

const blip = (freq: number, dur: number, vol: number, wave: 'pulse0.25' | 'pulse0.5' | 'pulse0.125' | 'triangle' = 'pulse0.25'): Sound => (v, at) =>
  v.tone({ wave, freq, at, dur, vol, release: 0.02 });

const arp = (notes: string[], step: number, vol: number, wave: 'pulse0.25' | 'pulse0.5' | 'pulse0.125' | 'triangle' = 'pulse0.5'): Sound => (v, at) =>
  notes.forEach((n, i) => v.tone({ wave, freq: noteFreq(n), at: at + i * step, dur: step * 0.9, vol, release: 0.03 }));

export const SOUNDS = {
  /** UI */
  hover: blip(1320, 0.02, 0.05, 'pulse0.125'),
  click: blip(880, 0.04, 0.12),
  confirm: arp(['C6', 'G6'], 0.05, 0.12),
  cancel: arp(['G5', 'C5'], 0.05, 0.1),
  open: arp(['E5', 'A5', 'E6'], 0.035, 0.08, 'pulse0.25'),
  close: arp(['E6', 'A5'], 0.035, 0.07, 'pulse0.25'),
  save: arp(['C5', 'E5', 'G5', 'C6'], 0.05, 0.1),
  /** One tick per printed character (throttled by the engine). */
  text: blip(1046, 0.012, 0.035, 'pulse0.125'),
  choice: arp(['A5', 'C6', 'E6'], 0.04, 0.1),
  page: (v, at) => v.noise({ at, dur: 0.09, vol: 0.12, cutoff: 3000, sweepTo: 900, filter: 'bandpass' }),
  /** Story */
  notify: arp(['E6', 'B6'], 0.07, 0.1, 'pulse0.125'),
  error: (v, at) => {
    v.tone({ wave: 'pulse0.5', freq: 196, at, dur: 0.14, vol: 0.16 });
    v.tone({ wave: 'pulse0.5', freq: 185, at: at + 0.16, dur: 0.22, vol: 0.16 });
  },
  glitch: (v, at) => {
    for (let i = 0; i < 6; i++) {
      v.noise({ at: at + i * 0.035, dur: 0.02, vol: 0.18, cutoff: 400 + i * 900, rate: 0.5 + i * 0.3 });
      v.tone({ wave: 'pulse0.125', freq: 200 + ((i * 7919) % 1800), at: at + i * 0.035, dur: 0.02, vol: 0.07 });
    }
  },
  hand: (v, at) => {
    v.noise({ at, dur: 0.5, vol: 0.2, cutoff: 300, sweepTo: 3000, filter: 'bandpass' });
    v.tone({ wave: 'triangle', freq: 90, slideTo: 40, at: at + 0.45, dur: 0.3, vol: 0.8 });
  },
  slam: (v, at) => {
    v.tone({ wave: 'triangle', freq: 120, slideTo: 30, at, dur: 0.35, vol: 0.9 });
    v.noise({ at, dur: 0.25, vol: 0.35, cutoff: 200, filter: 'lowpass', release: 0.2 });
  },
  splat: (v, at) => {
    v.noise({ at, dur: 0.18, vol: 0.4, cutoff: 900, sweepTo: 200, filter: 'lowpass', release: 0.15 });
    v.tone({ wave: 'triangle', freq: 70, slideTo: 35, at, dur: 0.2, vol: 0.7 });
  },
  erase: (v, at) => v.noise({ at, dur: 1.6, vol: 0.16, cutoff: 6000, sweepTo: 300, filter: 'bandpass', release: 0.4 }),
  heartbeat: (v, at) => {
    v.tone({ wave: 'triangle', freq: 70, slideTo: 45, at, dur: 0.1, vol: 0.7 });
    v.tone({ wave: 'triangle', freq: 64, slideTo: 42, at: at + 0.22, dur: 0.12, vol: 0.55 });
  },
  knock: (v, at) => [0, 0.18, 0.36].forEach((d) => v.tone({ wave: 'triangle', freq: 180, slideTo: 90, at: at + d, dur: 0.06, vol: 0.5 })),
  typewriter: (v, at) => v.noise({ at, dur: 0.015, vol: 0.12, cutoff: 4000 }),
  sparkle: arp(['C7', 'E7', 'G7', 'C8'], 0.03, 0.05, 'pulse0.125'),
  /** Mini-games */
  jump: (v, at) => v.tone({ wave: 'pulse0.25', freq: 300, slideTo: 760, at, dur: 0.12, vol: 0.13 }),
  land: (v, at) => v.noise({ at, dur: 0.03, vol: 0.12, cutoff: 600, filter: 'lowpass' }),
  hit: (v, at) => {
    v.noise({ at, dur: 0.12, vol: 0.3, cutoff: 500, filter: 'lowpass' });
    v.tone({ wave: 'pulse0.5', freq: 140, slideTo: 60, at, dur: 0.15, vol: 0.2 });
  },
  success: arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.06, 0.13),
  fail: arp(['G5', 'D#5', 'C5', 'G4'], 0.09, 0.13),
  correct: arp(['G5', 'C6'], 0.06, 0.12),
  wrong: (v, at) => v.tone({ wave: 'pulse0.5', freq: 220, slideTo: 150, at, dur: 0.22, vol: 0.13 }),
  creak: (v, at) => v.tone({ wave: 'sawtooth', freq: 80, slideTo: 55, at, dur: 0.7, vol: 0.06, vibrato: 0.04 }),
  rumble: (v, at) => v.noise({ at, dur: 1.2, vol: 0.3, cutoff: 160, filter: 'lowpass', release: 0.5 }),
} satisfies Record<string, Sound>;

export type SoundId = keyof typeof SOUNDS;
export const SOUND_IDS = Object.keys(SOUNDS) as SoundId[];

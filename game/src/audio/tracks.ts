// Original chiptune compositions for Geometry of Love (style reference: the
// 8-bit tracks the author shared; no material is taken from them).
// Each track is written as bars of 16 sixteenth-note steps:
//   lead / bass: tokens "A5" (note on), "-" (hold), "." (rest)
//   drums:       k = kick, s = snare, h = closed hat, o = open hat, c = crash
//   chords:      one symbol per bar ("C", "Am", "G7", "Fmaj7") for arpeggios/pads
import { noteFreq, type ToneOptions, type Voice } from './engine';

export interface Track {
  bpm: number;
  swing?: number;
  /** Number of bars before the loop repeats. */
  bars: unknown[];
  play(v: Voice, bar: number, step: number, at: number, stepDur: number): void;
}

interface Spec {
  bpm: number;
  swing?: number;
  chords: string[];
  lead?: string[];
  leadWave?: ToneOptions['wave'];
  leadVol?: number;
  leadVibrato?: number;
  leadRelease?: number;
  counter?: string[];
  counterWave?: ToneOptions['wave'];
  bass?: string[] | 'auto' | 'drive' | 'sparse' | 'none';
  bassOctave?: number;
  arp?: { octave: number; every: 1 | 2 | 4; wave?: ToneOptions['wave']; vol?: number; shape?: number[] };
  pad?: { octave: number; wave?: ToneOptions['wave']; vol?: number };
  drums?: string[];
  detune?: number;
  /** Repeat the first beat in the last beat of every 4th bar (a "stuck" loop). */
  stutter?: boolean;
}

const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  add9: [0, 4, 7, 14],
};

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

/** Chord symbol → note names in a given octave. */
export function chordNotes(symbol: string, octave: number): string[] {
  const m = /^([A-G][#b]?)(.*)$/.exec(symbol);
  if (!m) throw new Error(`Bad chord "${symbol}"`);
  const root = FLATS[m[1]!] ?? m[1]!;
  const intervals = QUALITY[m[2]!];
  if (!intervals) throw new Error(`Unknown chord quality "${symbol}"`);
  const base = NAMES.indexOf(root) + (octave + 1) * 12;
  return intervals.map((iv) => {
    const midi = base + iv;
    return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
  });
}

function tokens(bar: string): string[] {
  const t = bar.trim().split(/\s+/);
  if (t.length !== 16) throw new Error(`A bar must have 16 steps, got ${t.length}: "${bar}"`);
  return t.map((x) => (FLATS[x.slice(0, 2)] ? FLATS[x.slice(0, 2)] + x.slice(2) : x));
}

/** Length (in steps) of the note starting at `i`. */
function length(t: string[], i: number): number {
  let n = 1;
  while (i + n < 16 && t[i + n] === '-') n++;
  return n;
}

function drum(v: Voice, ch: string, at: number): void {
  if (ch === 'k') {
    v.tone({ wave: 'triangle', freq: 160, slideTo: 42, at, dur: 0.09, vol: 0.9, release: 0.04 });
  } else if (ch === 's') {
    v.noise({ at, dur: 0.07, vol: 0.32, cutoff: 1800, release: 0.06 });
    v.tone({ wave: 'triangle', freq: 220, slideTo: 140, at, dur: 0.05, vol: 0.35 });
  } else if (ch === 'h') v.noise({ at, dur: 0.02, vol: 0.12, cutoff: 7500, release: 0.02 });
  else if (ch === 'o') v.noise({ at, dur: 0.1, vol: 0.1, cutoff: 6500, release: 0.08 });
  else if (ch === 'c') v.noise({ at, dur: 0.5, vol: 0.16, cutoff: 5000, release: 0.6 });
}

function compose(s: Spec): Track {
  const bars = s.chords;
  const leads = s.lead?.map(tokens);
  const counters = s.counter?.map(tokens);
  const bassBars = Array.isArray(s.bass) ? s.bass.map(tokens) : null;
  const detune = s.detune ?? 0;
  return {
    bpm: s.bpm,
    swing: s.swing,
    bars,
    play(v, bar, step, at, stepDur) {
      let st = step;
      if (s.stutter && bar % 4 === 3 && step >= 12) st = step - 12; // the loop "sticks"
      const chord = bars[bar]!;
      const play = (t: string[] | undefined, wave: ToneOptions['wave'], vol: number, extra: Partial<ToneOptions> = {}) => {
        if (!t) return;
        const n = t[st]!;
        if (n === '.' || n === '-') return;
        v.tone({ wave, freq: noteFreq(n), at, dur: stepDur * length(t, st) * 0.92, vol, detune, ...extra });
      };
      play(leads?.[bar % leads.length], s.leadWave ?? 'pulse0.25', s.leadVol ?? 0.22, {
        vibrato: s.leadVibrato ?? 0.004,
        release: s.leadRelease ?? 0.05,
      });
      play(counters?.[bar % counters.length], s.counterWave ?? 'pulse0.5', 0.1);
      // Bass.
      const bo = s.bassOctave ?? 2;
      const root = chordNotes(chord, bo)[0]!;
      const fifth = chordNotes(chord, bo)[2]!;
      const up = chordNotes(chord, bo + 1)[0]!;
      if (bassBars) play(bassBars[bar % bassBars.length], 'triangle', 0.5);
      else if (s.bass === 'drive') v.tone({ wave: 'triangle', freq: noteFreq(st % 2 ? up : root), at, dur: stepDur * 0.8, vol: 0.45 });
      else if (s.bass === 'sparse') {
        if (st === 0) v.tone({ wave: 'triangle', freq: noteFreq(root), at, dur: stepDur * 7, vol: 0.4, release: 0.3 });
        if (st === 8) v.tone({ wave: 'triangle', freq: noteFreq(fifth), at, dur: stepDur * 7, vol: 0.32, release: 0.3 });
      } else if (s.bass !== 'none') {
        const pat = 'R.r.R.rF R.r.RFr.'.replace(' ', '');
        const c = pat[st]!;
        if (c !== '.') v.tone({ wave: 'triangle', freq: noteFreq(c === 'R' ? root : c === 'r' ? up : fifth), at, dur: stepDur * 1.6, vol: 0.45 });
      }
      // Arpeggio.
      if (s.arp && st % s.arp.every === 0) {
        const notes = chordNotes(chord, s.arp.octave);
        const shape = s.arp.shape ?? [0, 1, 2, 1];
        const idx = shape[(st / s.arp.every) % shape.length]!;
        const n = notes[idx % notes.length]!;
        const oct = Math.floor(idx / notes.length);
        v.tone({ wave: s.arp.wave ?? 'pulse0.125', freq: noteFreq(n) * 2 ** oct, at, dur: stepDur * s.arp.every * 0.8, vol: s.arp.vol ?? 0.07, detune });
      }
      // Pad: sustained chord at the start of each bar.
      if (s.pad && st === 0)
        for (const n of chordNotes(chord, s.pad.octave))
          v.tone({ wave: s.pad.wave ?? 'pulse0.5', freq: noteFreq(n), at, dur: stepDur * 15, vol: s.pad.vol ?? 0.035, attack: 0.08, release: 0.4, detune });
      // Drums.
      if (s.drums) {
        const d = s.drums[bar % s.drums.length]!.replace(/\s/g, '');
        drum(v, d[st] ?? '.', at);
      }
    },
  };
}

// ---------------------------------------------------------------------------

const BEAT = 'k.h.s.h.k.khs.hh';
const BEAT_FILL = 'k.h.s.h.k.s.ssss';

export const TRACKS: Record<string, Track> = {
  /** Title / main menu: bright, catchy 8-bit pop. */
  title: compose({
    bpm: 150,
    chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
    lead: [
      'A5 . C6 . A5 . G5 . F5 . G5 . A5 - C6 .',
      'B5 . D6 . B5 . A5 . G5 - - . D5 . G5 .',
      'G5 . B5 . G5 . E5 . B5 . A5 . G5 - E5 .',
      'A5 - - - E5 . A5 . C6 - B5 . A5 - G5 .',
      'F5 . A5 . C6 . A5 . D6 - C6 . A5 . F5 .',
      'G5 . B5 . D6 . G6 . F6 - D6 . B5 . G5 .',
      'E6 - - . D6 . C6 . G5 . C6 . E6 . G6 .',
      'C6 - - - - - . . G5 . E5 . C5 . . .',
    ],
    arp: { octave: 4, every: 1, shape: [0, 1, 2, 3, 2, 1] },
    drums: [BEAT, BEAT, BEAT, BEAT, BEAT, BEAT, BEAT, BEAT_FILL],
  }),

  /** The real world: muted, lonely, a little hopeful. */
  reality: compose({
    bpm: 84,
    chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'],
    lead: [
      'F4 - - - A4 - - - D5 - - - C5 - - -',
      'D5 - - - - - - - A4 - - - F4 - - -',
      'C5 - - - A4 - - - F4 - - - G4 - A4 -',
      'G4 - - - - - - - . . . . E4 - - -',
      'F4 - - - A4 - - - D5 - - - E5 - - -',
      'F5 - - - E5 - D5 - C5 - - - A4 - - -',
      'Bb4 - - - A4 - G4 - D5 - - - C5 - - -',
      'C#5 - - - - - - - E5 - - - - - - -',
    ],
    leadWave: 'triangle',
    leadVol: 0.3,
    leadRelease: 0.25,
    bass: 'sparse',
    arp: { octave: 4, every: 2, wave: 'pulse0.25', vol: 0.045, shape: [0, 1, 2, 1] },
    drums: ['....h.......h...'],
  }),

  /** «メロディのまほう»: cheerful, toy-like, a little too sweet. */
  app: compose({
    bpm: 132,
    swing: 0.12,
    chords: ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'],
    lead: [
      'C6 . A5 . F5 . A5 . C6 . D6 . C6 - - .',
      'G5 . E5 . C5 . E5 . G5 - A5 . G5 - - .',
      'F5 . A5 . D6 . A5 . F5 . E5 . D5 - - .',
      'D5 . F5 . Bb5 . A5 . G5 - F5 . D5 - - .',
      'A5 . C6 . F6 . E6 . D6 . C6 . A5 . C6 .',
      'G5 . C6 . E6 . D6 . C6 - - . G5 - - .',
      'Bb5 . A5 . G5 . F5 . D5 . F5 . G5 . A5 .',
      'G5 - - - - . E5 . C5 . E5 . G5 . . .',
    ],
    leadWave: 'pulse0.5',
    leadVol: 0.17,
    arp: { octave: 5, every: 2, shape: [0, 1, 2, 3] },
    drums: ['k...s...k.k.s...', 'k...s...k...s.h.'],
  }),

  /** The same app theme, but it no longer lets go: detuned, the loop sticks. */
  'app-uneasy': compose({
    bpm: 126,
    swing: 0.12,
    chords: ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'],
    lead: [
      'C6 . A5 . F5 . A5 . C6 . D6 . C6 - - .',
      'G5 . E5 . C5 . E5 . G5 - A5 . G5 - - .',
      'F5 . A5 . D6 . A5 . F5 . E5 . D5 - - .',
      'D5 . F5 . Bb5 . A5 . G5 - F5 . D5 - - .',
    ],
    leadWave: 'pulse0.5',
    leadVol: 0.16,
    detune: -28,
    stutter: true,
    bass: 'sparse',
    arp: { octave: 5, every: 4, shape: [0, 2] },
    drums: ['k.......k.......'],
  }),

  /** The Sandbox: playful, bouncy, alive. */
  sandbox: compose({
    bpm: 120,
    swing: 0.18,
    chords: ['G', 'Em', 'C', 'D', 'G', 'Em', 'Am', 'D'],
    lead: [
      'D5 . G5 . B5 . G5 . A5 . B5 . G5 - . .',
      'E5 . G5 . B5 - A5 . G5 . E5 . D5 - . .',
      'E5 . G5 . C6 . B5 . A5 - G5 . E5 - . .',
      'F#5 . A5 . D6 - C6 . B5 . A5 . F#5 - . .',
      'G5 . B5 . D6 . B5 . C6 . D6 . E6 - . .',
      'D6 . B5 . G5 . B5 . A5 - G5 . E5 - . .',
      'C5 . E5 . A5 . G5 . E5 . C5 . A4 - . .',
      'A4 . D5 . F#5 . A5 . D6 - - - . . . .',
    ],
    leadWave: 'pulse0.25',
    counter: ['. . . . D4 . . . . . . . D4 . . .'],
    counterWave: 'triangle',
    arp: { octave: 4, every: 2, shape: [0, 2, 1, 2] },
    drums: ['k..hs..hk.k.s..h'],
  }),

  /** Growing dread: ostinato, heartbeat kick. */
  tension: compose({
    bpm: 104,
    chords: ['Em', 'Em', 'C', 'B7', 'Em', 'Em', 'Am', 'B7'],
    bass: 'drive',
    bassOctave: 1,
    arp: { octave: 4, every: 1, wave: 'pulse0.25', vol: 0.06, shape: [0, 1, 2, 1, 0, 2, 1, 2] },
    pad: { octave: 3, wave: 'triangle', vol: 0.05 },
    drums: ['k..k............'],
  }),

  /** Horror: no melody, a detuned drone and a lonely music-box note. */
  horror: compose({
    bpm: 60,
    chords: ['Dm', 'Dm', 'Bbmaj7', 'A'],
    lead: [
      '. . . . . . . . . . . . A6 - - -',
      '. . . . . . . . . . . . . . . .',
      '. . . . F6 - - - . . . . . . . .',
      '. . . . . . . . C#6 - - - . . . .',
    ],
    leadWave: 'pulse0.125',
    leadVol: 0.06,
    leadRelease: 0.8,
    bass: 'sparse',
    bassOctave: 1,
    pad: { octave: 2, wave: 'triangle', vol: 0.09 },
    detune: -14,
    drums: ['k...............', '................', '........o.......', '................'],
  }),

  /** Erasure: the app theme as a slow, detuned music box. */
  erasure: compose({
    bpm: 66,
    chords: ['F', 'C', 'Dm', 'Bb'],
    lead: [
      'C6 - A5 - F5 - A5 - C6 - D6 - C6 - - -',
      'G5 - E5 - C5 - E5 - G5 - A5 - G5 - - -',
      'F5 - A5 - D6 - A5 - F5 - E5 - D5 - - -',
      'D5 - F5 - Bb5 - A5 - G5 - F5 - D5 - - -',
    ],
    leadWave: 'pulse0.125',
    leadVol: 0.12,
    leadRelease: 0.6,
    detune: -35,
    bass: 'none',
    pad: { octave: 3, wave: 'triangle', vol: 0.04 },
  }),

  /** The chase (chapter 14): fast, relentless. */
  chase: compose({
    bpm: 176,
    chords: ['Am', 'F', 'G', 'E', 'Am', 'F', 'Dm', 'E'],
    lead: [
      'A5 . A5 C6 . A5 E6 . D6 . C6 . B5 . A5 .',
      'A5 . A5 C6 . A5 F6 . E6 . D6 . C6 . A5 .',
      'B5 . B5 D6 . B5 G6 . F6 . E6 . D6 . B5 .',
      'G#5 - - . B5 - - . E6 - - . D6 C6 B5 G#5',
      'A5 . C6 . E6 . A6 . G6 . E6 . C6 . A5 .',
      'F5 . A5 . C6 . F6 . E6 . C6 . A5 . F5 .',
      'D6 . F6 . A6 . F6 . E6 . D6 . C6 . B5 .',
      'E6 - - - G#5 - - - B5 - - - E6 - - -',
    ],
    leadWave: 'pulse0.25',
    leadVol: 0.18,
    bass: 'drive',
    arp: { octave: 4, every: 1, shape: [0, 2, 1, 2] },
    drums: ['k.hhs.hhk.kks.hh', 'k.hhs.hhk.kks.sc'],
  }),

  /** The rainbow ride (chapter 15): heroic and bittersweet. */
  rainbow: compose({
    bpm: 168,
    chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    lead: [
      'E5 - G5 - C6 - - - B5 - C6 - D6 - - -',
      'D6 - - - B5 - G5 - D6 - E6 - D6 - B5 -',
      'C6 - - - E6 - - - A5 - B5 - C6 - E6 -',
      'F6 - - - E6 - D6 - C6 - - - A5 - - -',
      'G5 - C6 - E6 - - - D6 - E6 - F6 - - -',
      'G6 - - - F6 - E6 - D6 - B5 - G5 - - -',
      'A5 - C6 - F6 - - - E6 - D6 - C6 - A5 -',
      'B5 - - - D6 - - - G6 - - - - - - -',
    ],
    leadWave: 'pulse0.5',
    leadVol: 0.18,
    counter: ['C4 . . . E4 . . . G4 . . . E4 . . .'],
    counterWave: 'pulse0.25',
    bass: 'drive',
    arp: { octave: 5, every: 1, wave: 'pulse0.125', vol: 0.05, shape: [0, 1, 2, 3, 2, 1] },
    drums: ['k.h.s.h.k.h.s.hh', 'k.h.s.h.k.kcs.hh'],
  }),

  /** Epilogue and quiet endings. */
  epilogue: compose({
    bpm: 72,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'Gsus4'],
    lead: [
      'E5 - - - G5 - - - C6 - - - B5 - - -',
      'A5 - - - - - - - E5 - - - C5 - - -',
      'F5 - - - A5 - - - C6 - - - A5 - - -',
      'G5 - - - - - - - . . . . D5 - - -',
      'E5 - - - G5 - - - C6 - - - E6 - - -',
      'D6 - - - B5 - - - G5 - - - E5 - - -',
      'F5 - - - A5 - - - C6 - - - D6 - - -',
      'C6 - - - - - - - - - - - . . . .',
    ],
    leadWave: 'triangle',
    leadVol: 0.28,
    leadRelease: 0.3,
    bass: 'sparse',
    arp: { octave: 4, every: 2, wave: 'pulse0.25', vol: 0.04, shape: [0, 1, 2, 3] },
  }),
};

/** Mini-game 1 «Выход» uses the app theme; the episode raises instability as you climb. */
export const TRACK_IDS = Object.keys(TRACKS);

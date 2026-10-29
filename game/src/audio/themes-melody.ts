// Themes of Melody's app, of the game world inside it, of its inhabitants and
// of the code underneath. Original compositions. Melody's motif is the
// three-note fall 5–3–1 ("a cheerful three-note melody", chapter 2); it
// returns, bent, in app-uneasy and in ending 2.
import { compose, type Track } from './score';

/** «メロディのまほう». D major, 144 BPM, light swing: the 5–3–1 hook (A–F♯–D), a bubbly
 *  half-duty lead with fast vibrato, sparkling arpeggio, bouncing octave bass. Too sweet. */
export const appSweet: Track = compose({
  bpm: 144,
  swing: 0.1,
  kit: 'chip',
  lead: { wave: 'pulse0.5', vol: 0.16, vibrato: 0.008, vibratoRate: 7 },
  bass: { style: 'R.r.R.r.R.r.R.r.', wave: 'triangle', vol: 0.4, length: 1.2 },
  arp: { octave: 5, every: 2, wave: 'pulse0.125', vol: 0.05, shape: [0, 1, 2, 3] },
  sections: {
    A: {
      chords: ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'Em', 'A'],
      lead: [
        'A5 . F#5 . D5 - - . A5 . F#5 . D5 - - .',
        'B5 . A5 . F#5 . D5 . F#5 - - - - . . .',
        'G5 . B5 . D6 . B5 . A5 . G5 . F#5 . E5 .',
        'E5 . F#5 . G5 . A5 . A5 - - - - . . .',
        'A5 . F#5 . D5 - - . A5 . F#5 . D5 - - .',
        'D6 . C#6 . B5 . A5 . F#5 - - - D5 . . .',
        'G5 . F#5 . E5 . G5 . B5 . A5 . G5 . E5 .',
        'A5 - - - B5 . C#6 . D6 - - - - . . .',
      ],
      drums: ['k...s..hk.k.s...', 'k...s..hk...s.oh'],
    },
    B: {
      chords: ['G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D'],
      lead: [
        'D6 . . . B5 . . . G5 . A5 . B5 - - .',
        'C#6 . . . A5 . . . E5 . F#5 . G5 - - .',
        'A5 . C#6 . E6 . C#6 . A5 . F#5 . E5 . C#5 .',
        'D5 . F#5 . B5 - - - - . . . F#6 . . .',
        'D6 . . . B5 . . . G5 . A5 . B5 - - .',
        'E6 . . . C#6 . . . A5 . B5 . C#6 - - .',
        'A5 . F#5 . D5 - - . A5 . F#5 . D5 - - .',
        'D6 - - - - - - - A5 . F#5 . D5 . . .',
      ],
      drums: ['k.h.s.h.k.h.s.h.', 'k.h.s.h.k.k.s.oc'],
    },
  },
  form: ['A', 'B', 'A', 'B'],
});

/** The same app, possessive. D minor, 96 BPM: the 5–3–1 motif slowed and detuned, sinking
 *  a little flatter every bar; the loop sticks; in B it keeps repeating, shorter and shorter. */
export const appUneasy: Track = compose({
  bpm: 96,
  kit: 'lofi',
  detune: -20,
  drift: 10,
  stutter: true,
  lead: { wave: 'pulse0.5', vol: 0.13, vibrato: 0.012, vibratoRate: 3, release: 0.15 },
  pad: { octave: 3, wave: 'sine', vol: 0.05, attack: 0.5, release: 0.8, chorus: 14 },
  bass: { style: 'sparse', wave: 'sine', vol: 0.4, octave: 1 },
  arp: { octave: 5, every: 4, wave: 'pulse0.125', vol: 0.04, shape: [0, 2] },
  sections: {
    A: {
      chords: ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Eb', 'A'],
      lead: [
        'A5 - F5 - D5 - - - A5 - F5 - D5 - - -',
        'D6 - C6 - Bb5 - A5 - F5 - - - - - - -',
        'G5 - Bb5 - D6 - Bb5 - A5 - G5 - F5 - E5 -',
        'E5 - F5 - G5 - A5 - A5 - - - - - - -',
        'A5 - F5 - D5 - - - A5 - F5 - D5 - - -',
        'D6 - C6 - Bb5 - A5 - F5 - - - D5 - - -',
        'G5 - F5 - Eb5 - G5 - Bb5 - A5 - G5 - Eb5 -',
        'C#5 - - - - - - - - - - - . . . .',
      ],
      drums: ['k.......k...t...', 'k.......k.......'],
    },
    B: {
      chords: ['Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'A', 'Dm', 'A'],
      lead: [
        'A5 - F5 - D5 - . . A5 - F5 - D5 - . .',
        'A5 - F5 - D5 - . . A5 - F5 - . . . .',
        'A5 - F5 - . . . . A5 - F5 - . . . .',
        'A5 - . . . . . . A5 - . . . . . .',
        'F5 - D5 - Bb4 - - - F5 - D5 - Bb4 - - -',
        'E5 - C#5 - A4 - - - - - - - . . . .',
        'A5 - F5 - D5 - - - - - - - - - - -',
        '. . . . . . . . C#6 - - - - - - -',
      ],
      drums: ['....t.......t...'],
    },
  },
  form: ['A', 'B', 'A'],
});

/** Inside the game: hyper-cheerful candy. A major, 168 BPM: a thin 12.5% lead way up high
 *  with bouncing repeated notes, a fast six-note arpeggio, busy chip drums. */
export const gameCute: Track = compose({
  bpm: 168,
  kit: 'chip',
  lead: { wave: 'pulse0.125', vol: 0.14, release: 0.03 },
  counter: { wave: 'triangle', vol: 0.16 },
  bass: { style: 'R.r.R.r.R.r.RFr.', wave: 'pulse0.25', vol: 0.12, octave: 2, length: 1 },
  arp: { octave: 4, every: 1, wave: 'pulse0.25', vol: 0.04, shape: [0, 1, 2, 3, 2, 1] },
  sections: {
    A: {
      chords: ['A', 'F#m', 'D', 'E', 'A', 'F#m', 'Bm', 'E'],
      lead: [
        'E6 E6 . C#6 . E6 . A6 . E6 . C#6 . A5 . .',
        'F#6 F#6 . C#6 . F#6 . A6 . F#6 . C#6 . A5 . .',
        'F#6 . E6 . D6 . F#6 . A6 - - . F#6 . D6 .',
        'E6 . G#6 . B6 . G#6 . E6 - - - . . . .',
        'E6 E6 . C#6 . E6 . A6 . E6 . C#6 . A5 . .',
        'F#6 . A6 . C#7 . A6 . F#6 . E6 . C#6 . A5 .',
        'D6 . F#6 . B6 . A6 . G#6 . F#6 . E6 . D6 .',
        'C#6 . E6 . A6 - - - - . . . A5 . . .',
      ],
      drums: ['k.hhs.hhk.hks.hh'],
    },
    B: {
      chords: ['D', 'E', 'C#m', 'F#m', 'D', 'E', 'A', 'A'],
      lead: [
        'A5 . A5 . D6 . A5 . F#6 . D6 . A5 . D6 .',
        'B5 . B5 . E6 . B5 . G#6 . E6 . B5 . E6 .',
        'C#6 . E6 . G#6 . E6 . C#6 . G#5 . C#6 . E6 .',
        'F#6 - - - E6 - - - C#6 - - - A5 - - -',
        'A5 . A5 . D6 . A5 . F#6 . D6 . A5 . D6 .',
        'B5 . B5 . E6 . B5 . G#6 . B6 . G#6 . E6 .',
        'A6 . G#6 . F#6 . E6 . D6 . C#6 . B5 . G#5 .',
        'A5 - - - E6 . . . A6 - - - . . . .',
      ],
      counter: ['A3 . . . . . . . A3 . . . . . . .'],
      drums: ['k.h.s.h.k.h.s.h.', 'k.h.s.h.k.kcs.ss'],
    },
  },
  form: ['A', 'A', 'B', 'A'],
});

/** Inside the game when it goes wrong. A Phrygian (B♭, E♭ bent in), 108 BPM: the candy tune
 *  with its notes broken, glitch blips for drums, a shaky lead, a filtered saw bass. */
export const gameWrong: Track = compose({
  bpm: 108,
  kit: 'glitch',
  cutoff: 4200,
  detune: -30,
  stutter: true,
  lead: { wave: 'pulse0.125', vol: 0.18, vibrato: 0.02, vibratoRate: 7, release: 0.08 },
  counter: { wave: 'triangle', vol: 0.12, attack: 0.2, release: 0.4 },
  bass: { style: 'R..R..R.R..R..R.', wave: 'sawtooth', vol: 0.2, octave: 1, length: 2 },
  sections: {
    A: {
      chords: ['Am', 'Bb', 'Am', 'Eb', 'Am', 'Bbmaj7', 'Dm', 'E7'],
      lead: [
        'E6 E6 . C6 . E6 . A6 . Eb6 . C6 . A5 . .',
        'F6 F6 . D6 . F6 . Bb6 . F6 . D6 . Bb5 . .',
        'F6 . E6 . Eb6 . D6 . C6 - - - - . . .',
        'Bb5 . G5 . Eb5 . D5 . Bb4 - - - - . . .',
        'E6 E6 . C6 . E6 . A6 . Eb6 . C6 . A5 . .',
        'Bb6 . A6 . F6 . D6 . Bb5 . A5 . F5 . D5 .',
        'D6 . F6 . Ab6 . F6 . D6 . B5 . Ab5 . F5 .',
        'E5 - - - - - - - - - - - - - - -',
      ],
      counter: ['. . . . . . . . Eb4 - - - - - - -'],
      drums: ['k..g..k.s.g.k.gg', 'k..g..k.s...gg.g'],
    },
    B: {
      chords: ['Am', 'Am', 'Bb', 'Bb', 'Fm', 'Fm', 'E', 'E'],
      lead: [
        'A6 - - - - - - - - - - - . . . .',
        '. . . . Eb6 - - - - - - - . . . .',
        'D6 - - - - - - - Bb5 - - - - - - -',
        'A5 - - - Bb5 - - - A5 - - - . . . .',
        'Ab5 - - - - - - - C6 - - - - - - -',
        'B5 - - - - - - - F5 - - - - - - -',
        'E6 - - - - - - - G#5 - - - - - - -',
        'B5 - - - D6 - - - F6 - - - G#6 - - -',
      ],
      bassStyle: 'sparse',
      drums: ['k...............', 'k.......g.......', 'k...........g.g.', 'k.......g...gggg'],
    },
  },
  form: ['A', 'B', 'A'],
});

/** The school-tool friends of the Sandbox. F major in a 12/8 shuffle, 100 BPM: a warm
 *  chorused triangle voice, brushed drums, a walking root–fifth bass, an easy lilt. */
export const friends: Track = compose({
  bpm: 100,
  meter: { steps: 12, perBeat: 3 },
  kit: 'brush',
  lead: { wave: 'triangle', vol: 0.26, release: 0.12, chorus: 6, vibrato: 0.004 },
  bass: { style: 'R..F..R..r..', wave: 'triangle', vol: 0.42, length: 2.5 },
  arp: { octave: 4, every: 3, wave: 'pulse0.25', vol: 0.04, shape: [0, 1, 2, 1] },
  sections: {
    A: {
      chords: ['F', 'Dm', 'Bb', 'C7', 'F', 'Am', 'Bb', 'C7'],
      lead: [
        'A4 - - C5 - - F5 - - E5 - D5',
        'D5 - - - - - A4 - - F5 - E5',
        'D5 - - Bb4 - - F5 - - D5 - C5',
        'C5 - - - - - . . . G4 A4 Bb4',
        'A4 - - C5 - - F5 - - G5 - A5',
        'E5 - - - - - C5 - - E5 - G5',
        'F5 - - D5 - - Bb4 - - D5 - F5',
        'E5 - - - - - G5 - - - - -',
      ],
      drums: ['k..h..s..h.h'],
    },
    B: {
      chords: ['Bb', 'C', 'Am', 'Dm', 'Gm', 'C7', 'F', 'F'],
      lead: [
        'D5 - - F5 - - Bb5 - - A5 - G5',
        'E5 - - G5 - - C6 - - Bb5 - G5',
        'A5 - - - - - E5 - - C5 - E5',
        'F5 - - - - - D5 - - - - -',
        'G5 - - Bb5 - - D6 - - C6 - Bb5',
        'A5 - - - - - G5 - - E5 - C5',
        'F5 - - - - - A5 - - C6 - -',
        'F6 - - - - - - - - . . .',
      ],
      drums: ['k..h..s..h.h', 'k..h..s..hss'],
    },
  },
  form: ['A', 'B', 'A', 'B'],
});

/** The code under the game. C, 88 BPM, stacked fourths and whole tones: isolated sine
 *  pings with long digital echoes, a "computing" 12.5% arpeggio, ticks instead of drums. */
export const codeSpace: Track = compose({
  bpm: 88,
  kit: 'code',
  lead: { wave: 'sine', vol: 0.17, release: 0.2, echo: { steps: 3, vol: 0.5, repeats: 3 } },
  bass: { style: 'sparse', wave: 'sine', vol: 0.42, octave: 1 },
  arp: { octave: 4, every: 1, wave: 'pulse0.125', vol: 0.028, shape: [0, 2, 1, 3, 0, 3, 2, 1] },
  pad: { octave: 3, wave: 'sawtooth', vol: 0.012, attack: 1, release: 1 },
  sections: {
    A: {
      chords: ['Cq4', 'Cq4', 'Dq4', 'Dq4', 'Abq4', 'Abq4', 'Bbq4', 'Bbq4'],
      lead: [
        'C6 . . . . . . . G6 . . . . . . .',
        '. . . . D6 . . . . . . . . . . .',
        'D6 . . . . . . . A6 . . . . . . .',
        '. . . . E6 . . . . . . . . . . .',
        'Ab5 . . . . . . . Eb6 . . . . . . .',
        '. . . . F#6 . . . . . . . . . . .',
        'Bb5 . . . . . . . F6 . . . . . . .',
        '. . . . C7 . . . . . . . D7 . . .',
      ],
      drums: ['t...t...t...t..g', 't...t...t.g.t...'],
    },
    B: {
      chords: ['Ebq4', 'Fq4', 'Dbq4', 'Cq4', 'Ebq4', 'Fq4', 'Gq4', 'Gq4'],
      lead: [
        'G6 . F6 . Eb6 . C6 . . . . . . . . .',
        'A6 . G6 . F6 . D6 . . . . . . . . .',
        'F6 . Eb6 . Db6 . Bb5 . . . . . . . . .',
        'E6 . D6 . C6 . G5 . . . . . . . . .',
      ],
      drums: ['k...t...t.g.t...', 't...t...t...tggg'],
    },
  },
  form: ['A', 'B', 'A'],
});

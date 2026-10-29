// The three ending themes. Original compositions.
import { compose, type Track } from './score';

/** Ending 1 «Самоучка». A♭ major, 84 BPM: plain and honest — one 25% square lead with no
 *  tricks, a triangle bass, light hats. Quiet self-respect, not a triumph. */
export const endingSelfTaught: Track = compose({
  bpm: 84,
  kit: 'lofi',
  lead: { wave: 'pulse0.25', vol: 0.16, attack: 0.01, release: 0.12 },
  bass: { style: 'R.......F...R...', wave: 'triangle', vol: 0.42, length: 3 },
  arp: { octave: 4, every: 2, wave: 'pulse0.125', vol: 0.035, shape: [0, 1, 2, 1] },
  sections: {
    A: {
      chords: ['Ab', 'Eb', 'Fm', 'Db', 'Ab', 'Eb', 'Db', 'Eb'],
      lead: [
        'C5 - - - Eb5 - - - Ab5 - - - G5 - F5 -',
        'G5 - - - - - - - Eb5 - - - . . . .',
        'F5 - - - Ab5 - - - C6 - - - Bb5 - Ab5 -',
        'Ab5 - - - - - F5 - - - - - . . . .',
        'C5 - - - Eb5 - - - Ab5 - - - Bb5 - C6 -',
        'Bb5 - - - - - G5 - Eb5 - - - . . . .',
        'F5 - - - Ab5 - - - Db6 - - - C6 - Bb5 -',
        'Bb5 - - - - - - - - - - - . . . .',
      ],
      drums: ['k...h...s...h...'],
    },
    B: {
      chords: ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Bbm', 'Eb'],
      lead: [
        'C6 - - - - - Ab5 - F5 - - - Ab5 - - -',
        'Ab5 - - - - - F5 - Db5 - - - . . . .',
        'Eb5 - - - Ab5 - - - C6 - - - Eb6 - - -',
        'Db6 - - - - - - - Bb5 - - - G5 - - -',
        'C6 - - - - - Ab5 - F5 - - - Ab5 - - -',
        'Ab5 - - - - - F5 - Db5 - - - F5 - - -',
        'Db5 - - - F5 - - - Bb5 - - - Ab5 - - -',
        'G5 - - - Bb5 - - - Eb5 - - - . . . .',
      ],
      drums: ['k...h.h.s...h.h.'],
    },
    tag: {
      chords: ['Ab', 'Ab'],
      lead: ['Ab5 - - - - - - - - - - - - - - -', '. . . . . . . . . . . . . . . .'],
      arp: false,
    },
  },
  form: ['A', 'B', 'A', 'tag'],
});

/** Ending 2 «Мой любимый ученик». C major music-box waltz (3/4), 104 BPM: Melody's 5–3–1
 *  (G–E–C) at the very top, echoing, slowly going flat, a metronome tick and a stuck loop —
 *  sweet and hollow, lessons forever. */
export const endingFavouriteStudent: Track = compose({
  bpm: 104,
  meter: { steps: 12, perBeat: 4 },
  kit: 'code',
  drift: 8,
  stutter: true,
  lead: { wave: 'pulse0.125', vol: 0.17, release: 0.8, echo: { steps: 6, vol: 0.35, repeats: 1 } },
  pad: { octave: 4, wave: 'pulse0.25', vol: 0.025, hits: [4, 8], attack: 0.005, release: 0.15 },
  bass: { style: 'R...........', wave: 'sine', vol: 0.5, length: 3.5 },
  sections: {
    A: {
      chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G'],
      lead: [
        'G6 - - E6 - - C6 - - - - -',
        'A6 - - E6 - - C6 - - - - -',
        'A6 - - F6 - - C6 - - D6 - -',
        'B5 - - - - - D6 - - - - -',
        'G6 - - E6 - - C6 - - - - -',
        'C7 - - A6 - - E6 - - - - -',
        'F6 - - E6 - - D6 - - A5 - -',
        'B5 - - - - - - - - . . .',
      ],
      drums: ['t...........'],
    },
    B: {
      chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
      lead: [
        'A6 - - - - - C7 - - A6 - -',
        'G6 - - - - - B6 - - G6 - -',
        'E6 - - - - - G6 - - E6 - -',
        'C6 - - - - - E6 - - A6 - -',
        'A6 - - G6 - - F6 - - C6 - -',
        'D6 - - - - - G6 - - F6 - -',
        'G6 - - E6 - - C6 - - - - -',
        'G6 - - E6 - - C6 - - - - -',
      ],
      drums: ['t...........'],
    },
  },
  form: ['A', 'B', 'A', 'B'],
});

/** Ending 3 «За пределами экрана». G major, 80 BPM: open and hopeful — a soft half-duty lead,
 *  a chorused pad, a rising "rainbow pixel" sparkle arpeggio with echo; drums only in B. */
export const endingBeyondScreen: Track = compose({
  bpm: 80,
  kit: 'brush',
  lead: { wave: 'pulse0.5', vol: 0.13, attack: 0.03, release: 0.3, vibrato: 0.005 },
  pad: { octave: 3, wave: 'pulse0.25', vol: 0.03, attack: 0.4, release: 0.8, chorus: 8 },
  bass: { style: 'R.......F...r...', wave: 'triangle', vol: 0.4, length: 4 },
  arp: { octave: 5, every: 1, wave: 'pulse0.125', vol: 0.022, shape: [0, 1, 2, 3, 4, 5, 4, 3], echo: { steps: 2, vol: 0.4, repeats: 1 } },
  sections: {
    A: {
      chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
      lead: [
        'B4 - - - D5 - - - G5 - - - F#5 - - -',
        'F#5 - - - - - - - A4 - - - D5 - - -',
        'E5 - - - G5 - - - B5 - - - A5 - G5 -',
        'G5 - - - - - - - E5 - - - . . . .',
        'B4 - - - D5 - - - G5 - - - A5 - B5 -',
        'A5 - - - - - F#5 - D5 - - - . . . .',
        'E5 - - - G5 - - - C6 - - - B5 - A5 -',
        'A5 - - - - - - - - - - - . . . .',
      ],
    },
    B: {
      chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am7', 'Dsus4'],
      lead: [
        'G5 - - - B5 - - - E6 - - - D6 - B5 -',
        'C6 - - - - - - - G5 - - - E5 - - -',
        'D5 - - - G5 - - - B5 - - - D6 - - -',
        'A5 - - - - - - - F#5 - - - D5 - - -',
        'G5 - - - B5 - - - E6 - - - F#6 - G6 -',
        'E6 - - - - - - - C6 - - - G5 - - -',
        'A5 - - - C6 - - - E6 - - - D6 - C6 -',
        'D6 - - - - - - - C6 - - - A5 - - -',
      ],
      drums: ['k.......s.......', 'k.....k.s.......'],
    },
    outro: {
      chords: ['G', 'G'],
      lead: ['G5 - - - - - - - - - - - - - - -', '. . . . . . . . . . . . . . . .'],
    },
  },
  form: ['A', 'B', 'A', 'outro'],
});

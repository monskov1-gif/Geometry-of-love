// Themes of the real world and of the story's dark turns. Original
// compositions (no borrowed material). The map of which theme plays where is
// content/music-map.ts; the reasons are in docs/MUSIC.md.
import { compose, type Track } from './score';

/** Title / main menu. B minor, 92 BPM. A music box with echo over a slow chorus pad:
 *  Melody's three-note motif (5–3–1) heard in minor, before the story begins. */
export const title: Track = compose({
  bpm: 92,
  kit: 'lofi',
  lead: { wave: 'pulse0.125', vol: 0.13, release: 0.9, echo: { steps: 3, vol: 0.42, repeats: 2 } },
  pad: { octave: 3, wave: 'sine', vol: 0.05, attack: 0.7, release: 1.2, chorus: 7 },
  bass: { style: 'sparse', wave: 'triangle', vol: 0.36 },
  arp: { octave: 4, every: 2, wave: 'pulse0.25', vol: 0.03, shape: [0, 1, 2, 1] },
  sections: {
    intro: {
      chords: ['Bm', 'G'],
      lead: ['F#5 - - . D5 - - . B4 - - - - - - -', '. . . . . . . . . . . . . . . .'],
      arp: false,
    },
    A: {
      chords: ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F#'],
      lead: [
        'F#5 - - . D5 - - . B4 - - - C#5 - D5 -',
        'E5 - - - D5 - B4 - G4 - - - - - - -',
        'F#5 - - . A5 - - . D6 - - - C#6 - B5 -',
        'A5 - - - - - - - E5 - - - . . . .',
        'F#5 - - . D5 - - . B4 - - - C#5 - D5 -',
        'E5 - - - F#5 - G5 - B5 - - - A5 - G5 -',
        'G5 - - - F#5 - E5 - B4 - - - D5 - E5 -',
        'F#5 - - - - - - - A#4 - - - . . . .',
      ],
      drums: ['k.......t.......', 'k.....k.t.......'],
    },
    B: {
      chords: ['G', 'A', 'F#m', 'Bm', 'Em', 'A', 'D', 'F#'],
      lead: [
        'B5 - - - - - D6 - C#6 - B5 - A5 - - -',
        'A5 - - - - - C#6 - B5 - A5 - G5 - - -',
        'A5 - - - F#5 - - - C#6 - - - A5 - - -',
        'B5 - - - - - - - - - - - . . . .',
        'G5 - - - B5 - E6 - D6 - - - B5 - - -',
        'C#6 - - - E6 - - - A5 - - - . . . .',
        'F#6 - - - E6 - D6 - A5 - - - F#5 - - -',
        'A#5 - - - - - - - C#6 - - - F#5 - - -',
      ],
      drums: ['k.......t.....t.', 'k.....k.t...t...'],
    },
  },
  form: ['intro', 'A', 'B', 'A'],
});

/** Dameo's room. E♭ major / C minor, 70 BPM, swung lo-fi: muffled electric-piano
 *  stabs, a sub bass and a lazy, warbling lead; half of the B section is an empty room. */
export const homeNight: Track = compose({
  bpm: 70,
  swing: 0.24,
  kit: 'lofi',
  cutoff: 2800,
  lead: { wave: 'triangle', vol: 0.24, attack: 0.02, release: 0.3, vibrato: 0.006, vibratoRate: 0.8 },
  pad: { octave: 3, wave: 'triangle', vol: 0.045, hits: [0, 6, 10], attack: 0.01, release: 0.25, chorus: 9 },
  bass: { style: 'R.......F.....R.', wave: 'sine', vol: 0.32, octave: 2, length: 5 },
  sections: {
    A: {
      chords: ['Cm7', 'Abmaj7', 'Ebmaj7', 'Bb7', 'Cm7', 'Abmaj7', 'Fm7', 'G7'],
      lead: [
        '. . G4 - Bb4 - C5 - - - . . Eb5 - D5 -',
        'C5 - - - - - . . . . G4 - Ab4 - G4 -',
        'Eb4 - - - . . G4 - Bb4 - D5 - - - . .',
        'C5 - Bb4 - - - Ab4 - G4 - - - . . . .',
        '. . G4 - Bb4 - C5 - - - . . Eb5 - G5 -',
        'F5 - Eb5 - - - C5 - - - . . Eb5 - D5 -',
        'C5 - - - Ab4 - - - F4 - - - G4 - Ab4 -',
        'B4 - - - - - - - D5 - - - . . . .',
      ],
      drums: ['k..hs..h..khs..h'],
    },
    B: {
      chords: ['Abmaj7', 'Bb7', 'Gm7', 'Cm7', 'Fm7', 'Bb7', 'Ebmaj7', 'G7'],
      lead: [
        '. . . . . . . . . . . . . . . .',
        '. . . . . . . . . . . . . . . .',
        '. . . . . . . . Bb5 - - - G5 - - -',
        'Eb5 - - - - - - - . . . . . . . .',
        'Ab4 - C5 - Eb5 - - - F5 - Eb5 - C5 - - -',
        'D5 - - - Bb4 - - - . . . . . . . .',
        'G4 - Bb4 - Eb5 - - - D5 - Eb5 - G5 - - -',
        'F5 - - - - - - - D5 - - - B4 - - -',
      ],
      drums: ['..h...h...h...h.', '..h...h...h...h.', '..h...h...h...h.', '..h...h...h...h.', 'k..hs..h..khs..h'],
    },
  },
  form: ['A', 'B', 'A'],
});

/** The university by day. E minor in 7/8 at 126 BPM: an odd, hurried meter, a ticking
 *  rim like a wall clock, staccato square-wave phrases that never settle. */
export const university: Track = compose({
  bpm: 126,
  meter: { steps: 14, perBeat: 4 },
  kit: 'chip',
  lead: { wave: 'pulse0.25', vol: 0.15, release: 0.03 },
  bass: { style: 'R.....R...F.r.', wave: 'triangle', vol: 0.42, octave: 2, length: 1.4 },
  arp: { octave: 4, every: 2, wave: 'pulse0.5', vol: 0.045, shape: [0, 1, 2, 1, 2, 1, 0] },
  sections: {
    A: {
      chords: ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'Am', 'B7'],
      lead: [
        'B4 . E5 . G5 . F#5 . E5 . . . B4 .',
        'C5 . E5 . G5 . A5 . G5 - F#5 . E5 .',
        'E5 . G5 . C6 . B5 . A5 . . . G5 .',
        'F#5 - - . A5 . D5 . F#5 . E5 . D5 .',
        'B4 . E5 . G5 . F#5 . E5 . . . G5 .',
        'B5 . A5 . G5 . F#5 . G5 - - . . .',
        'A5 . C6 . E6 . C6 . B5 . A5 . G5 .',
        'F#5 . D#5 . F#5 . B5 - - - . . . .',
      ],
      drums: ['k.h.s.h.k.hs.h', 'k.h.s.h.k.hs.h', 'k.h.s.h.k.hs.h', 'k.h.s.hkk.hs.h'],
    },
    B: {
      chords: ['C', 'D', 'Bm', 'Em', 'C', 'D', 'B7', 'B7'],
      lead: [
        'E5 - - - G5 - - - - . B5 - . .',
        'A5 - - - F#5 - - - - . D5 - . .',
        'D5 - F#5 - B5 - - - A5 - G5 - F#5 -',
        'E5 - - - - - - . . . . . . .',
        'E5 - - - G5 - - - - . C6 - . .',
        'D6 - - - A5 - - - - . F#5 - . .',
        'D#5 - F#5 - A5 - B5 - - - A5 - F#5 -',
        'D#5 - - - - - - . B4 . D#5 . F#5 .',
      ],
      drums: ['t.t.t.t.t.t.t.', 'k.t.s.t.k.ts.t'],
    },
  },
  form: ['A', 'B', 'A', 'B'],
});

/** Danger, stalking. F♯ minor, 118 BPM: a heartbeat kick, a filtered saw bass
 *  pushing on the eighths, a one-note ostinato and long, cold high notes. */
export const tension: Track = compose({
  bpm: 118,
  kit: 'heart',
  cutoff: 2400,
  lead: { wave: 'triangle', vol: 0.13, attack: 0.3, release: 0.5, vibrato: 0.004, vibratoRate: 3 },
  bass: { style: 'R.R.R.R.R.R.R.RR', wave: 'sawtooth', vol: 0.16, octave: 1, length: 1.5 },
  arp: { octave: 4, every: 1, wave: 'pulse0.25', vol: 0.045, shape: [0, 0, 1, 0, 2, 0, 1, 0] },
  sections: {
    A: {
      chords: ['F#m', 'F#m', 'Dmaj7', 'C#', 'F#m', 'F#m', 'G', 'C#'],
      lead: [
        '. . . . . . . . . . . . . . . .',
        'C#6 - - - - - - - - - - - . . . .',
        '. . . . . . . . . . . . . . . .',
        'C6 - - - - - - - - - - - B5 - - -',
        '. . . . . . . . . . . . . . . .',
        'A5 - - - - - - - G#5 - - - - - - -',
        '. . . . . . . . G5 - - - - - - -',
        'F#5 - - - - - - - - - - - F5 - - -',
      ],
      drums: ['b...........b...', 'b.......b.......'],
    },
    B: {
      chords: ['D', 'D', 'E', 'E', 'F#m', 'F#m', 'G', 'C#7'],
      lead: [
        'F#5 - - - - - - - A5 - - - - - - -',
        'F#5 - - - - - - - D6 - - - - - - -',
        'G#5 - - - - - - - B5 - - - - - - -',
        'G#5 - - - - - - - E6 - - - - - - -',
        'A5 - - - - - - - C#6 - - - - - - -',
        'A5 - - - - - - - F#6 - - - - - - -',
        'G6 - - - - - - - D6 - - - B5 - - -',
        'F5 - - - - - - - G#5 - - - C#6 - - -',
      ],
      drums: ['b.......b...s...', 'b..b....b.b.s.ss'],
    },
  },
  form: ['A', 'B', 'A'],
});

/** Loss. G minor waltz (3/4) at 58 BPM: one soft triangle voice, a sine pad that
 *  swells in, a music-box lilt on the beats, no drums at all. */
export const grief: Track = compose({
  bpm: 58,
  meter: { steps: 12, perBeat: 4 },
  lead: { wave: 'triangle', vol: 0.24, attack: 0.05, release: 0.6 },
  pad: { octave: 3, wave: 'sine', vol: 0.045, attack: 1, release: 1.5, chorus: 6 },
  bass: { style: 'sparse', wave: 'sine', vol: 0.4 },
  arp: { octave: 4, every: 4, wave: 'pulse0.125', vol: 0.035, shape: [0, 1, 2], release: 0.4 },
  sections: {
    A: {
      chords: ['Gm', 'Ebmaj7', 'Cm7', 'D', 'Gm', 'Bb', 'Cm', 'D'],
      lead: [
        'D5 - - - - - Bb4 - - - A4 -',
        'G4 - - - - - - - - - . .',
        'Eb5 - - - - - D5 - - - C5 -',
        'D5 - - - - - - - - - . .',
        'D5 - - - - - G5 - - - F5 -',
        'F5 - - - - - D5 - - - Bb4 -',
        'C5 - - - Eb5 - - - D5 - C5 -',
        'A4 - - - - - - - - - . .',
      ],
    },
    B: {
      chords: ['Eb', 'Bb', 'Cm', 'Gm', 'Eb', 'Bb', 'Am7b5', 'D'],
      lead: [
        'G5 - - - - - Bb5 - - - G5 -',
        'F5 - - - - - - - - - D5 -',
        'Eb5 - - - - - G5 - - - Eb5 -',
        'D5 - - - - - - - - - . .',
        'G5 - - - - - Bb5 - - - C6 -',
        'D6 - - - - - - - - - Bb5 -',
        'A5 - - - - - G5 - - - F#5 -',
        'F#5 - - - - - - - - - . .',
      ],
    },
  },
  form: ['A', 'B', 'A'],
});

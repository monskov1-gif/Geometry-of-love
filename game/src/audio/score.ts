// Score format for the synthesised themes.
// A theme is a form (a sequence of named sections); each section is a list of
// bars with one chord symbol per bar and optional note bars for its voices.
//   lead / counter / bass: one token per step — "A5" (note on), "-" (hold), "." (rest)
//   drums: one character per step —
//     k kick, s snare, h closed hat, o open hat, c crash, t rim/tick,
//     b heartbeat (double thump), g glitch blip, . rest
//   chords: "C", "Am", "G7", "Fmaj7", "Dq4" (stacked fourths) … for bass, arpeggio and pad
// A bar has `meter.steps` steps (16 = 4/4 in sixteenths, 12 = 3/4 or 12/8, 14 = 7/8).
import { noteFreq, type ToneOptions, type Voice } from './voice';

export interface Track {
  bpm: number;
  swing?: number;
  stepsPerBar: number;
  stepsPerBeat: number;
  /** Low-pass cutoff of the whole theme in Hz (muffled lo-fi, filtered dread). */
  cutoff?: number;
  /** One entry per bar of the full form, before the loop repeats. */
  bars: unknown[];
  play(v: Voice, bar: number, step: number, at: number, stepDur: number): void;
}

type Wave = ToneOptions['wave'];
export type Kit = 'chip' | 'lofi' | 'heart' | 'glitch' | 'brush' | 'code';

export interface VoiceSpec {
  wave?: Wave;
  vol?: number;
  attack?: number;
  release?: number;
  vibrato?: number;
  vibratoRate?: number;
  /** Delay repeats: every `steps` steps, each `vol` times quieter. */
  echo?: { steps: number; vol: number; repeats?: number };
  /** Second voice detuned by ± this many cents (warm/wide). */
  chorus?: number;
}

export interface ArpSpec extends VoiceSpec {
  octave: number;
  every: number;
  shape?: number[];
}

export interface PadSpec extends VoiceSpec {
  octave: number;
  /** Steps of the bar where the chord is struck (default: the downbeat only). */
  hits?: number[];
}

export interface BassSpec {
  wave?: Wave;
  vol?: number;
  octave?: number;
  /**
   * 'sparse' = root + fifth, long; 'drive' = root/octave every step; 'none';
   * or a pattern with one character per step: R root, r root an octave up, F fifth, . rest.
   */
  style: 'sparse' | 'drive' | 'none' | string;
  /** Note length in steps for pattern hits (default 1.6). */
  length?: number;
}

export interface Section {
  chords: string[];
  lead?: string[];
  counter?: string[];
  /** Written bass bars; otherwise the style from the spec (or `bassStyle`). */
  bass?: string[];
  bassStyle?: BassSpec['style'];
  drums?: string[];
  /** Switch the spec's arpeggio / pad off for this section. */
  arp?: false;
  pad?: false;
}

export interface Spec {
  bpm: number;
  swing?: number;
  meter?: { steps: number; perBeat: number };
  kit?: Kit;
  cutoff?: number;
  /** Detune of every pitched voice in cents. */
  detune?: number;
  /** Extra flattening per bar within each 4-bar group (the theme "sinks" and snaps back). */
  drift?: number;
  /** In the last bar of every 4, the last quarter repeats the first one (a stuck loop). */
  stutter?: boolean;
  lead?: VoiceSpec;
  counter?: VoiceSpec;
  bass?: BassSpec;
  arp?: ArpSpec;
  pad?: PadSpec;
  sections: Record<string, Section>;
  form: string[];
}

const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7, 12],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  m7b5: [0, 3, 6, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  add9: [0, 4, 7, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  q4: [0, 5, 10, 15],
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

function tokens(bar: string, steps: number): string[] {
  const t = bar.trim().split(/\s+/);
  if (t.length !== steps) throw new Error(`A bar must have ${steps} steps, got ${t.length}: "${bar}"`);
  return t.map((x) => {
    const sharp = FLATS[x.slice(0, 2)];
    const n = sharp ? sharp + x.slice(2) : x;
    if (n !== '.' && n !== '-') noteFreq(n); // throws on a typo at load time
    return n;
  });
}

function drumBar(bar: string, steps: number): string {
  const d = bar.replace(/\s/g, '');
  if (d.length !== steps) throw new Error(`A drum bar must have ${steps} steps, got ${d.length}: "${bar}"`);
  if (/[^kshoctbg.]/.test(d)) throw new Error(`Unknown drum in "${bar}"`);
  return d;
}

/** Length (in steps) of the note starting at `i`. */
function length(t: string[], i: number): number {
  let n = 1;
  while (i + n < t.length && t[i + n] === '-') n++;
  return n;
}

function drum(v: Voice, ch: string, at: number, kit: Kit): void {
  const soft = kit === 'lofi' || kit === 'brush' || kit === 'code';
  switch (ch) {
    case 'k':
      if (soft || kit === 'heart') v.tone({ wave: 'sine', freq: 120, slideTo: 40, at, dur: 0.16, vol: 0.85, release: 0.06 });
      else v.tone({ wave: 'triangle', freq: 160, slideTo: 42, at, dur: 0.09, vol: 0.9, release: 0.04 });
      break;
    case 's':
      if (kit === 'brush') v.noise({ at, dur: 0.16, vol: 0.1, cutoff: 3200, filter: 'bandpass', release: 0.16 });
      else if (soft || kit === 'heart') v.noise({ at, dur: 0.08, vol: 0.2, cutoff: 2600, filter: 'lowpass', release: 0.12 });
      else {
        v.noise({ at, dur: 0.07, vol: 0.32, cutoff: 1800, release: 0.06 });
        v.tone({ wave: 'triangle', freq: 220, slideTo: 140, at, dur: 0.05, vol: 0.35 });
      }
      break;
    case 'h':
      v.noise({ at, dur: 0.02, vol: soft ? 0.05 : 0.12, cutoff: 7500, release: 0.02 });
      break;
    case 'o':
      v.noise({ at, dur: 0.1, vol: soft ? 0.05 : 0.1, cutoff: 6500, release: 0.08 });
      break;
    case 'c':
      v.noise({ at, dur: 0.5, vol: soft ? 0.08 : 0.16, cutoff: 5000, release: 0.6 });
      break;
    case 't':
      if (kit === 'code') v.tone({ wave: 'sine', freq: 2400, at, dur: 0.015, vol: 0.09, release: 0.02 });
      else v.tone({ wave: 'triangle', freq: 1100, slideTo: 800, at, dur: 0.02, vol: 0.14, release: 0.02 });
      break;
    case 'b':
      v.tone({ wave: 'sine', freq: 70, slideTo: 42, at, dur: 0.12, vol: 0.95, release: 0.08 });
      v.tone({ wave: 'sine', freq: 62, slideTo: 40, at: at + 0.17, dur: 0.1, vol: 0.6, release: 0.08 });
      break;
    case 'g':
      v.noise({ at, dur: 0.035, vol: 0.16, cutoff: 3000, rate: 0.25, release: 0.01 });
      v.tone({ wave: 'pulse0.125', freq: 1900, slideTo: 3800, at, dur: 0.03, vol: 0.06, release: 0.01 });
      break;
  }
}

interface Bar {
  chord: string;
  lead?: string[];
  counter?: string[];
  bass?: string[];
  bassStyle: BassSpec['style'];
  drums?: string;
  arp: boolean;
  pad: boolean;
}

/** Turns a spec into a playable theme; throws on any malformed bar. */
export function compose(s: Spec): Track {
  const steps = s.meter?.steps ?? 16;
  const kit = s.kit ?? 'chip';
  const bars: Bar[] = [];
  for (const name of s.form) {
    const sec = s.sections[name];
    if (!sec) throw new Error(`Unknown section "${name}"`);
    const lead = sec.lead?.map((b) => tokens(b, steps));
    const counter = sec.counter?.map((b) => tokens(b, steps));
    const bass = sec.bass?.map((b) => tokens(b, steps));
    const drums = sec.drums?.map((b) => drumBar(b, steps));
    sec.chords.forEach((chord, i) => {
      chordNotes(chord, 3); // validate
      bars.push({
        chord,
        lead: lead?.[i % lead.length],
        counter: counter?.[i % counter.length],
        bass: bass?.[i % bass.length],
        bassStyle: sec.bassStyle ?? s.bass?.style ?? 'sparse',
        drums: drums?.[i % drums.length],
        arp: sec.arp !== false,
        pad: sec.pad !== false,
      });
    });
  }
  const style = s.bass?.style;
  if (style && !['sparse', 'drive', 'none'].includes(style) && style.length !== steps) {
    throw new Error(`Bass pattern must have ${steps} steps: "${style}"`);
  }
  const stuckFrom = Math.floor((steps * 3) / 4);

  return {
    bpm: s.bpm,
    swing: s.swing,
    stepsPerBar: steps,
    stepsPerBeat: s.meter?.perBeat ?? 4,
    cutoff: s.cutoff,
    bars,
    play(v, barIndex, step, at, stepDur) {
      const bar = bars[barIndex]!;
      let st = step;
      if (s.stutter && barIndex % 4 === 3 && step >= stuckFrom) st = step - stuckFrom; // the loop "sticks"
      const detune = (s.detune ?? 0) - (s.drift ?? 0) * (barIndex % 4);

      const note = (vs: VoiceSpec, freq: number, startAt: number, dur: number, vol: number, extra: Partial<ToneOptions> = {}) => {
        const base: ToneOptions = {
          wave: vs.wave ?? 'pulse0.25',
          freq,
          at: startAt,
          dur,
          vol,
          attack: vs.attack,
          release: vs.release,
          vibrato: vs.vibrato,
          vibratoRate: vs.vibratoRate,
          detune,
          ...extra,
        };
        if (vs.chorus) {
          v.tone({ ...base, vol: vol * 0.6, detune: base.detune! - vs.chorus });
          v.tone({ ...base, vol: vol * 0.6, detune: base.detune! + vs.chorus });
        } else v.tone(base);
        if (vs.echo) {
          const repeats = vs.echo.repeats ?? 2;
          for (let k = 1; k <= repeats; k++) {
            v.tone({ ...base, at: startAt + k * vs.echo.steps * stepDur, dur: Math.min(dur, vs.echo.steps * stepDur), vol: vol * vs.echo.vol ** k });
          }
        }
      };
      const line = (t: string[] | undefined, vs: VoiceSpec | undefined, vol: number) => {
        if (!t || !vs) return;
        const n = t[st]!;
        if (n === '.' || n === '-') return;
        note(vs, noteFreq(n), at, stepDur * length(t, st) * 0.92, vs.vol ?? vol);
      };

      line(bar.lead, s.lead ?? {}, 0.2);
      line(bar.counter, s.counter ?? { wave: 'pulse0.5' }, 0.1);

      // Bass.
      const b = s.bass ?? { style: 'sparse' };
      const bassVoice: VoiceSpec = { wave: b.wave ?? 'triangle', release: 0.05 };
      const bo = b.octave ?? 2;
      const chord = chordNotes(bar.chord, bo);
      const root = chord[0]!;
      const fifth = chord[2] ?? chord[1]!;
      const up = chordNotes(bar.chord, bo + 1)[0]!;
      const bvol = b.vol ?? 0.45;
      if (bar.bass) line(bar.bass, { ...bassVoice, vol: bvol }, bvol);
      else if (bar.bassStyle === 'drive') note(bassVoice, noteFreq(st % 2 ? up : root), at, stepDur * 0.8, bvol);
      else if (bar.bassStyle === 'sparse') {
        const half = Math.floor(steps / 2);
        if (st === 0) note({ ...bassVoice, release: 0.3 }, noteFreq(root), at, stepDur * (half - 1), bvol * 0.9);
        if (st === half) note({ ...bassVoice, release: 0.3 }, noteFreq(fifth), at, stepDur * (half - 1), bvol * 0.7);
      } else if (bar.bassStyle !== 'none') {
        const c = bar.bassStyle[st];
        if (c && c !== '.') note(bassVoice, noteFreq(c === 'R' ? root : c === 'r' ? up : fifth), at, stepDur * (b.length ?? 1.6), bvol);
      }

      // Arpeggio.
      if (s.arp && bar.arp && st % s.arp.every === 0) {
        const notes = chordNotes(bar.chord, s.arp.octave);
        const shape = s.arp.shape ?? [0, 1, 2, 1];
        const idx = shape[(st / s.arp.every) % shape.length]!;
        const n = notes[idx % notes.length]!;
        const oct = Math.floor(idx / notes.length);
        note({ wave: 'pulse0.125', ...s.arp }, noteFreq(n) * 2 ** oct, at, stepDur * s.arp.every * 0.8, s.arp.vol ?? 0.07);
      }

      // Pad: the chord struck on the given steps, held until the next hit.
      if (s.pad && bar.pad) {
        const hits = s.pad.hits ?? [0];
        const i = hits.indexOf(st);
        if (i >= 0) {
          const until = hits[i + 1] ?? steps;
          for (const n of chordNotes(bar.chord, s.pad.octave)) {
            note({ wave: 'pulse0.5', attack: 0.08, release: 0.4, ...s.pad }, noteFreq(n), at, stepDur * (until - st - 0.5), s.pad.vol ?? 0.035);
          }
        }
      }

      if (bar.drums) drum(v, bar.drums[st]!, at, kit);
    },
  };
}

/** Length of one pass through the theme, in seconds. */
export function trackDuration(t: Track): number {
  return (t.bars.length * t.stepsPerBar * 60) / t.bpm / t.stepsPerBeat;
}

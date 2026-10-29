// Chip voices on the Web Audio API: pulse waves with 12.5/25/50% duty,
// triangle, sine, sawtooth and NES-style noise. Works on any BaseAudioContext,
// so the same voices play live (engine.ts) and render offline (verification).

export interface ToneOptions {
  wave: 'pulse0.125' | 'pulse0.25' | 'pulse0.5' | 'triangle' | 'sine' | 'sawtooth';
  freq: number;
  at: number;
  dur: number;
  vol: number;
  attack?: number;
  release?: number;
  slideTo?: number;
  /** Vibrato depth as a fraction of the frequency. */
  vibrato?: number;
  /** Vibrato speed in Hz (default 5.5; slow values give a tape "warble"). */
  vibratoRate?: number;
  detune?: number;
}

export interface NoiseOptions {
  at: number;
  dur: number;
  vol: number;
  cutoff?: number;
  sweepTo?: number;
  filter?: BiquadFilterType;
  rate?: number;
  release?: number;
}

export interface Voice {
  ctx: BaseAudioContext;
  tone(o: ToneOptions): void;
  noise(o: NoiseOptions): void;
}

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** "A4" → 440 Hz. Accepts sharps ("C#5"); flats are converted to sharps by the score parser. */
export function noteFreq(note: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(note);
  if (!m) throw new Error(`Bad note "${note}"`);
  const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]!]!;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Builds the wave tables and noise once per context; returns a voice factory. */
export function createVoices(ctx: BaseAudioContext): (dest: AudioNode) => Voice {
  const waves = new Map<string, PeriodicWave>();
  for (const duty of [0.125, 0.25, 0.5]) waves.set(`pulse${duty}`, pulseWave(ctx, duty));
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let lfsr = 1;
  for (let i = 0; i < data.length; i++) {
    // NES-style LFSR noise for a "hardware" texture.
    const bit = (lfsr ^ (lfsr >> 1)) & 1;
    lfsr = (lfsr >> 1) | (bit << 14);
    data[i] = bit ? 0.8 : -0.8;
  }
  return (dest) => ({
    ctx,
    tone: (o) => {
      const osc = ctx.createOscillator();
      if (o.wave === 'triangle' || o.wave === 'sine' || o.wave === 'sawtooth') osc.type = o.wave;
      else osc.setPeriodicWave(waves.get(o.wave)!);
      osc.frequency.setValueAtTime(o.freq, o.at);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, o.at + o.dur);
      if (o.vibrato) {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = o.vibratoRate ?? 5.5;
        depth.gain.value = o.freq * o.vibrato;
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(o.at + 0.08);
        lfo.stop(o.at + o.dur + (o.release ?? 0.04) + 0.05);
      }
      if (o.detune) osc.detune.value = o.detune;
      const g = ctx.createGain();
      envelope(g.gain, o.at, o.dur, o.vol, o.attack ?? 0.004, o.release ?? 0.04);
      osc.connect(g).connect(dest);
      osc.start(o.at);
      osc.stop(o.at + o.dur + (o.release ?? 0.04) + 0.02);
    },
    noise: (o) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      src.playbackRate.value = o.rate ?? 1;
      const f = ctx.createBiquadFilter();
      f.type = o.filter ?? 'highpass';
      f.frequency.setValueAtTime(o.cutoff ?? 1000, o.at);
      if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, o.at + o.dur);
      const g = ctx.createGain();
      envelope(g.gain, o.at, o.dur, o.vol, 0.002, o.release ?? 0.03);
      src.connect(f).connect(g).connect(dest);
      src.start(o.at, (o.at * 7.31) % 0.5); // varied but deterministic offset into the noise
      src.stop(o.at + o.dur + 0.1);
    },
  });
}

function envelope(p: AudioParam, at: number, dur: number, vol: number, attack: number, release: number): void {
  const a = Math.min(attack, Math.max(0.004, dur * 0.9));
  p.setValueAtTime(0.0001, at);
  p.exponentialRampToValueAtTime(Math.max(0.0002, vol), at + a);
  p.setValueAtTime(Math.max(0.0002, vol), at + Math.max(a, dur - 0.01));
  p.exponentialRampToValueAtTime(0.0001, at + dur + release);
}

/** Band-limited pulse wave from its Fourier series. */
function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const n = 64;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty);
    imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty);
  }
  return ctx.createPeriodicWave(real, imag);
}

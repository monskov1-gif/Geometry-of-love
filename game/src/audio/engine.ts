// Chiptune audio engine on the Web Audio API. Everything is synthesised in the
// browser (pulse waves with 12.5/25/50% duty, triangle, noise), so the game
// ships original music and sound without audio files.
//
// Browsers block audio until the player interacts with the page: the engine
// creates its AudioContext on the first pointer/key event and then starts the
// music that was requested meanwhile.
import type { Track } from './tracks';
import { TRACKS } from './tracks';
import { SOUNDS, type SoundId } from './sfx';

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** "A4" → 440 Hz. Accepts sharps ("C#5") and flats written as sharps. */
export function noteFreq(note: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(note);
  if (!m) throw new Error(`Bad note "${note}"`);
  const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]!]!;
  return 440 * 2 ** ((midi - 69) / 12);
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private waves = new Map<string, PeriodicWave>();
  private noise!: AudioBuffer;
  private current: { id: string; track: Track; gain: GainNode; step: number; nextTime: number; bar: number } | null = null;
  private requested: string | null = null;
  private settings: AudioSettings = { musicVolume: 0.55, sfxVolume: 0.8, muted: false };
  private lastText = 0;
  /** 0..1: chance that the music "sticks" on a step (Mini-game 1 «Выход»). */
  private instability = 0;

  constructor() {
    const unlock = () => {
      this.ensure();
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  get started(): boolean {
    return this.ctx !== null;
  }

  get currentTrack(): string | null {
    return this.requested;
  }

  apply(settings: AudioSettings): void {
    this.settings = settings;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, 0.05);
    this.musicBus.gain.setTargetAtTime(settings.musicVolume * 0.5, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(settings.sfxVolume * 0.6, t, 0.05);
  }

  /** Switches the music with a short crossfade; null fades to silence. */
  music(id: string | null): void {
    if (id === this.requested && (this.current?.id === id || !this.ctx)) return;
    this.requested = id;
    if (!this.ctx) return; // will start on unlock
    this.startTrack(id);
  }

  /** Makes the current music loop and stumble (0 = stable, 1 = broken). */
  setInstability(amount: number): void {
    this.instability = Math.max(0, Math.min(1, amount));
  }

  sfx(id: SoundId | string): void {
    if (!this.ctx || this.settings.muted) return;
    const sound = SOUNDS[id as SoundId];
    if (!sound) {
      console.error(`[audio] unknown sound "${id}"`);
      return;
    }
    if (id === 'text') {
      const now = performance.now();
      if (now - this.lastText < 45) return;
      this.lastText = now;
    }
    sound(this.voice(), this.ctx.currentTime + 0.005);
  }

  private ensure(): void {
    if (this.ctx) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      console.error('[audio] Web Audio is not supported; the game runs silently');
      return;
    }
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    // Gentle low-pass: tames the harshest square-wave harmonics.
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 9000;
    this.musicBus.connect(tone);
    this.sfxBus.connect(tone);
    tone.connect(this.master);
    for (const duty of [0.125, 0.25, 0.5]) this.waves.set(`pulse${duty}`, pulseWave(ctx, duty));
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let lfsr = 1;
    for (let i = 0; i < data.length; i++) {
      // NES-style LFSR noise for a "hardware" texture.
      const bit = (lfsr ^ (lfsr >> 1)) & 1;
      lfsr = (lfsr >> 1) | (bit << 14);
      data[i] = bit ? 0.8 : -0.8;
    }
    this.apply(this.settings);
    window.setInterval(() => this.schedule(), 25);
    if (this.requested) this.startTrack(this.requested);
  }

  private startTrack(id: string | null): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    if (this.current) {
      const old = this.current.gain;
      old.gain.setTargetAtTime(0, t, 0.25);
      window.setTimeout(() => old.disconnect(), 1500);
      this.current = null;
    }
    if (!id) return;
    const track = TRACKS[id];
    if (!track) {
      console.error(`[audio] unknown track "${id}"`);
      return;
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(1, t + 0.6);
    gain.connect(this.musicBus);
    this.current = { id, track, gain, step: 0, nextTime: t + 0.08, bar: 0 };
  }

  /** Lookahead scheduler: queues notes up to 120 ms ahead. */
  private schedule(): void {
    const ctx = this.ctx;
    const cur = this.current;
    if (!ctx || !cur) return;
    const stepDur = 60 / cur.track.bpm / 4;
    while (cur.nextTime < ctx.currentTime + 0.12) {
      const bars = cur.track.bars;
      const barIndex = cur.bar % bars.length;
      const swing = cur.step % 2 === 1 ? (cur.track.swing ?? 0) * stepDur : 0;
      cur.track.play(this.voice(cur.gain), barIndex, cur.step, cur.nextTime + swing, stepDur);
      // Instability: sometimes the step repeats instead of advancing.
      const stuck = this.instability > 0 && Math.random() < this.instability * 0.35;
      if (!stuck) cur.step++;
      if (cur.step >= 16) {
        cur.step = 0;
        cur.bar++;
      }
      cur.nextTime += stepDur;
    }
  }

  /** Low-level voice API handed to tracks and sounds. */
  private voice(dest: AudioNode = this.sfxBus): Voice {
    const ctx = this.ctx!;
    return {
      ctx,
      tone: (o) => {
        const osc = ctx.createOscillator();
        if (o.wave === 'triangle' || o.wave === 'sine' || o.wave === 'sawtooth') osc.type = o.wave;
        else osc.setPeriodicWave(this.waves.get(o.wave)!);
        osc.frequency.setValueAtTime(o.freq, o.at);
        if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, o.at + o.dur);
        if (o.vibrato) {
          const lfo = ctx.createOscillator();
          const depth = ctx.createGain();
          lfo.frequency.value = 5.5;
          depth.gain.value = o.freq * o.vibrato;
          lfo.connect(depth).connect(osc.frequency);
          lfo.start(o.at + 0.08);
          lfo.stop(o.at + o.dur + 0.05);
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
        src.buffer = this.noise;
        src.loop = true;
        src.playbackRate.value = o.rate ?? 1;
        const f = ctx.createBiquadFilter();
        f.type = o.filter ?? 'highpass';
        f.frequency.setValueAtTime(o.cutoff ?? 1000, o.at);
        if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, o.at + o.dur);
        const g = ctx.createGain();
        envelope(g.gain, o.at, o.dur, o.vol, 0.002, o.release ?? 0.03);
        src.connect(f).connect(g).connect(dest);
        src.start(o.at, Math.random() * 0.5);
        src.stop(o.at + o.dur + 0.1);
      },
    };
  }
}

export interface ToneOptions {
  wave: 'pulse0.125' | 'pulse0.25' | 'pulse0.5' | 'triangle' | 'sine' | 'sawtooth';
  freq: number;
  at: number;
  dur: number;
  vol: number;
  attack?: number;
  release?: number;
  slideTo?: number;
  vibrato?: number;
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
  ctx: AudioContext;
  tone(o: ToneOptions): void;
  noise(o: NoiseOptions): void;
}

function envelope(p: AudioParam, at: number, dur: number, vol: number, attack: number, release: number): void {
  p.setValueAtTime(0.0001, at);
  p.exponentialRampToValueAtTime(Math.max(0.0002, vol), at + attack);
  p.setValueAtTime(Math.max(0.0002, vol), at + Math.max(attack, dur - 0.01));
  p.exponentialRampToValueAtTime(0.0001, at + dur + release);
}

/** Band-limited pulse wave from its Fourier series. */
function pulseWave(ctx: AudioContext, duty: number): PeriodicWave {
  const n = 64;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty);
    imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty);
  }
  return ctx.createPeriodicWave(real, imag);
}

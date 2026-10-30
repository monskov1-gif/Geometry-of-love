// Chiptune audio engine on the Web Audio API. Most music and every sound are
// synthesised in the browser (voice.ts); a few story themes are recorded files
// (audio/recorded.ts), mixed on the same music bus.
//
// Changing the theme always crossfades: the old theme keeps playing while it
// fades out and the new one fades in. Asking for the theme that already plays
// changes nothing (it is never restarted).
//
// Browsers block audio until the player interacts with the page: the engine
// creates its AudioContext on the first pointer/key event and then starts the
// music that was requested meanwhile.
import { TRACKS, resolveTrackId, type Track } from './tracks';
import { SOUNDS, type SoundId } from './sfx';
import { RECORDED } from './recorded';
import { createVoices, type Voice } from './voice';

export { noteFreq } from './voice';
export type { NoiseOptions, ToneOptions, Voice } from './voice';

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  /** Japanese voice-over (0 = off). */
  voiceVolume: number;
  muted: boolean;
}

/** Crossfade timing (seconds). */
const FADE_IN = 1.8;
const FADE_OUT_TC = 0.6; // time constant: about 1% left after 2.8 s
const FADE_OUT_END = 3.2;

interface Player {
  id: string;
  track: Track;
  gain: GainNode;
  step: number;
  bar: number;
  nextTime: number;
  /** Set while fading out: scheduling stops at this context time. */
  endsAt?: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private voiceBus!: GainNode;
  /** The voice line playing now; a new line or stopSpeech() cuts it. */
  private speech: { src: AudioBufferSourceNode; ends: number } | null = null;
  private speechToken = 0;
  private voices!: (dest: AudioNode) => Voice;
  private current: Player | null = null;
  /** Themes still sounding while they fade out under the new one. */
  private fading: Player[] = [];
  private requested: string | null = null;
  /** The recorded theme playing now (null while a synthesised track or silence plays). */
  private recorded: { id: string; url: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  /** A one-shot song that has played to its end: asking for it again keeps its follow-up theme. */
  private songDone: string | null = null;
  private settings: AudioSettings = { musicVolume: 0.55, sfxVolume: 0.8, voiceVolume: 0.9, muted: false };
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

  /** The theme asked for last (aliases resolved), or null for silence. */
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
    this.voiceBus.gain.setTargetAtTime(settings.voiceVolume, t, 0.05);
  }

  /**
   * Plays a voice line (stopping the one before). Resolves with its length in seconds,
   * or 0 when the voice is off, audio is locked or the file failed (reported).
   */
  async speak(url: string): Promise<number> {
    this.stopSpeech();
    if (!this.ctx || this.settings.muted || this.settings.voiceVolume <= 0) return 0;
    const token = ++this.speechToken;
    let buffer: AudioBuffer;
    try {
      buffer = await this.loadBuffer(url);
    } catch (e) {
      console.error(`[audio] voice line failed to load: ${url}`, e);
      return 0;
    }
    if (token !== this.speechToken || !this.ctx) return 0; // the player moved on while it loaded
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.voiceBus);
    src.start();
    this.speech = { src, ends: this.ctx.currentTime + buffer.duration };
    src.onended = () => {
      if (this.speech?.src === src) this.speech = null;
    };
    return buffer.duration;
  }

  /** Seconds left of the voice line playing now. */
  get speechLeft(): number {
    return this.speech && this.ctx ? Math.max(0, this.speech.ends - this.ctx.currentTime) : 0;
  }

  stopSpeech(): void {
    this.speechToken++;
    if (!this.speech) return;
    const { src } = this.speech;
    this.speech = null;
    src.onended = null;
    src.stop();
  }

  /** Crossfades to a theme (aliases accepted); null fades to silence; the playing theme is kept. */
  music(requestedId: string | null): void {
    let id = requestedId === null ? null : resolveTrackId(requestedId);
    // the story keeps asking for the scene's music on every step: a finished song is not sung again
    const follow = id ? RECORDED[id]?.then : undefined;
    if (id && id === this.songDone && follow) id = resolveTrackId(follow);
    else if (this.songDone && id !== resolveTrackId(RECORDED[this.songDone]?.then ?? '')) this.songDone = null; // the story moved on
    if (id === this.requested && (this.current?.id === id || this.recorded?.id === id || !this.ctx)) return;
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
    sound(this.voices(this.sfxBus), this.ctx.currentTime + 0.005);
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
    // the voice skips the music low-pass: consonants need their highs
    this.voiceBus = ctx.createGain();
    this.voiceBus.connect(this.master);
    // Gentle low-pass: tames the harshest square-wave harmonics.
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 9000;
    this.musicBus.connect(tone);
    this.sfxBus.connect(tone);
    tone.connect(this.master);
    this.voices = createVoices(ctx);
    this.apply(this.settings);
    window.setInterval(() => this.schedule(), 25);
    if (this.requested) this.startTrack(this.requested);
  }

  private loadBuffer(url: string): Promise<AudioBuffer> {
    let p = this.buffers.get(url);
    if (!p) {
      p = fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.arrayBuffer();
        })
        .then((data) => this.ctx!.decodeAudioData(data));
      p.catch((e: unknown) => {
        console.error(`[audio] could not load ${url}`, e);
        this.buffers.delete(url);
      });
      this.buffers.set(url, p);
    }
    return p;
  }

  /** Fades out whatever recorded theme plays (a different one, or silence, follows). */
  private stopRecorded(): void {
    const r = this.recorded;
    if (!r || !this.ctx) return;
    r.gain.gain.setTargetAtTime(0, this.ctx.currentTime, FADE_OUT_TC);
    // looping sources never end by themselves, so stop() is always valid here
    window.setTimeout(() => {
      r.src.stop();
      r.gain.disconnect();
    }, (FADE_OUT_END + 0.5) * 1000);
    this.recorded = null;
  }

  private startRecorded(id: string): void {
    const spec = RECORDED[id]!;
    const ctx = this.ctx!;
    const r = this.recorded;
    if (r && r.url === spec.url) {
      // Same file, another section: keep playing, only the loop changes.
      r.id = id;
      r.src.loopStart = spec.loopStart;
      if (spec.loopEnd) r.src.loopEnd = spec.loopEnd;
      return;
    }
    this.stopRecorded();
    void this.loadBuffer(spec.url).then(
      (buffer) => {
        if (this.requested !== id || !this.ctx) return; // something else was asked for meanwhile
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = !spec.then;
        src.loopStart = spec.loopStart;
        src.loopEnd = spec.loopEnd ?? buffer.duration;
        if (spec.then) {
          const next = spec.then;
          src.onended = () => {
            if (this.recorded?.src !== src) return; // replaced or stopped meanwhile
            this.songDone = id;
            this.requested = null;
            this.music(next);
          };
        }
        const gain = ctx.createGain();
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(spec.gain, t + FADE_IN * 0.7);
        src.connect(gain).connect(this.musicBus);
        src.start(t, spec.start);
        this.recorded = { id, url: spec.url, src, gain };
      },
      (e: unknown) => console.warn(`[audio] theme "${id}" skipped`, e), // the game continues without it
    );
  }

  /** Moves the synthesised theme to the fading list; it keeps playing while it fades. */
  private fadeOutCurrent(): void {
    const cur = this.current;
    if (!cur || !this.ctx) return;
    const t = this.ctx.currentTime;
    cur.gain.gain.cancelScheduledValues(t);
    cur.gain.gain.setValueAtTime(Math.max(0.0001, cur.gain.gain.value), t);
    cur.gain.gain.setTargetAtTime(0, t, FADE_OUT_TC);
    cur.endsAt = t + FADE_OUT_END;
    this.fading.push(cur);
    this.current = null;
  }

  private startTrack(id: string | null): void {
    const ctx = this.ctx!;
    if (!id || !RECORDED[id]) this.stopRecorded();
    this.fadeOutCurrent();
    if (!id) return;
    if (RECORDED[id]) {
      this.startRecorded(id);
      return;
    }
    const track = TRACKS[id];
    if (!track) {
      console.error(`[audio] unknown track "${id}"`);
      return;
    }
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(1, t + FADE_IN);
    if (track.cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = track.cutoff;
      gain.connect(filter).connect(this.musicBus);
    } else gain.connect(this.musicBus);
    this.current = { id, track, gain, step: 0, bar: 0, nextTime: t + 0.08 };
  }

  /** Lookahead scheduler: queues notes up to 120 ms ahead for the current and fading themes. */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.current) this.advance(this.current, ctx, this.instability);
    this.fading = this.fading.filter((p) => {
      if (ctx.currentTime < p.endsAt!) {
        this.advance(p, ctx, 0);
        return true;
      }
      p.gain.disconnect();
      return false;
    });
  }

  private advance(p: Player, ctx: AudioContext, instability: number): void {
    const { track } = p;
    const stepDur = 60 / track.bpm / track.stepsPerBeat;
    const horizon = Math.min(ctx.currentTime + 0.12, p.endsAt ?? Infinity);
    while (p.nextTime < horizon) {
      const swing = p.step % 2 === 1 ? (track.swing ?? 0) * stepDur : 0;
      track.play(this.voices(p.gain), p.bar % track.bars.length, p.step, p.nextTime + swing, stepDur);
      // Instability: sometimes the step repeats instead of advancing.
      const stuck = instability > 0 && Math.random() < instability * 0.35;
      if (!stuck) p.step++;
      if (p.step >= track.stepsPerBar) {
        p.step = 0;
        p.bar++;
      }
      p.nextTime += stepDur;
    }
  }
}

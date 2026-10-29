// Cutscene Director: plays a staged scene described as data (content/cutscenes)
// on the shared 3D world — shots and camera moves, actors walking, running,
// turning and changing expression, captions synchronised with the action,
// music and sound accents, fades, flashes and shakes, location changes — and
// hands control back to the story when the last cue ends.
//
// Cues run in order; `par` runs a group at once and waits for the longest;
// `async: true` starts a cue without waiting for it. Skipping switches every
// remaining cue to "instant": the final state is the same as after watching.
import type { AppScreenState } from './app-screen';
import type { ActorFacing } from './actor';
import type { Shot } from './types';
import type { World3D } from './world';
import type { Emotion } from '../render/sprites';

export type Place = string | [number, number];

export type Cue = (
  | { do: 'location'; id: string; state?: string; variant?: string | null }
  | { do: 'cast'; actors: { id: string; at: Place; facing?: ActorFacing; emotion?: Emotion }[] }
  | { do: 'remove'; actor: string }
  | { do: 'shot'; shot: string | Shot; dur?: number }
  | { do: 'move'; actor: string; to: Place; speed?: number; run?: boolean }
  | { do: 'turn'; actor: string; facing: ActorFacing }
  | { do: 'emote'; actor: string; emotion: Emotion }
  | { do: 'line'; speaker?: string; text: string; dur?: number }
  | { do: 'sfx'; sound: string }
  | { do: 'music'; track: string | null }
  | { do: 'fade'; to: 'black' | 'white' | 'red' | 'clear'; dur?: number }
  | { do: 'flash'; color?: string; dur?: number }
  | { do: 'shake'; strength?: number; dur?: number }
  | { do: 'wait'; dur: number }
  /** Waits until this many seconds after the scene started (keeps a scene in sync with its music). */
  | { do: 'until'; t: number }
  | { do: 'screen'; state: Partial<AppScreenState> }
  | { do: 'light'; state: string }
  | { do: 'actorFx'; actor: string; fx: ActorEffect; dur?: number; to?: Place }
  | { do: 'prop'; name: string; action: string; dur?: number; target?: string }
  | { do: 'letterbox'; on: boolean }
  | { do: 'par'; cues: Cue[] }
) & { async?: boolean };

/** Effects on an actor's figure: shrinking into a screen, being erased, dissolving, appearing. */
export type ActorEffect = 'shrink' | 'grow' | 'erase' | 'dissolve' | 'appear' | 'tremble' | 'fall' | 'stretch';

export interface Cutscene {
  id: string;
  title: string;
  cues: Cue[];
}

/** What the Director needs from the screen around the world. */
export interface DirectorHost {
  world: World3D;
  /** Caption at the bottom; resolves when its time is up (or the player hurries it). */
  caption(speaker: string | null, text: string, dur: number): Promise<void>;
  overlay(kind: 'fade' | 'flash' | 'shake' | 'letterbox', value: { to?: string; color?: string; strength?: number; on?: boolean }, dur: number): Promise<void>;
  sfx(sound: string): void;
  music(track: string | null): void;
  /** Story-level props (e.g. the hand from the monitor) live in the world module. */
  prop(name: string, action: string, dur: number, target?: string): Promise<void>;
}

const wait = (s: number) => new Promise<void>((r) => window.setTimeout(r, s * 1000));

/** Reading time for a caption: enough for a calm reader, never a forced crawl. */
export const captionTime = (text: string) => Math.min(7, 1.4 + text.length * 0.055);

export class Director {
  private instant = false;
  private hurry: (() => void) | null = null;
  private stopped = false;

  constructor(private readonly host: DirectorHost) {}

  /** Finish everything at once (the player pressed «Пропустить»). */
  skip(): void {
    this.instant = true;
    this.hurry?.();
  }

  /** Shorten the current wait/caption (a click during the scene). */
  next(): void {
    this.hurry?.();
  }

  stop(): void {
    this.stopped = true;
    this.instant = true;
    this.hurry?.();
  }

  get skipping(): boolean {
    return this.instant;
  }

  private started = 0;

  async play(scene: Cutscene): Promise<void> {
    const w = this.host.world;
    this.started = performance.now();
    w.setAutoFrame(false);
    try {
      for (const cue of scene.cues) {
        if (this.stopped) return;
        const p = this.run(cue);
        if (!cue.async) await p;
      }
    } finally {
      w.setAutoFrame(true);
    }
  }

  /** A wait the player can cut short. */
  private hold(seconds: number): Promise<void> {
    if (this.instant || seconds <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const t = window.setTimeout(done, seconds * 1000);
      const self = this;
      function done() {
        window.clearTimeout(t);
        if (self.hurry === done) self.hurry = null;
        resolve();
      }
      this.hurry = done;
    });
  }

  private place(at: Place): { x: number; z: number; facing?: ActorFacing } {
    if (Array.isArray(at)) return { x: at[0], z: at[1] };
    const m = this.host.world.current?.marks[at];
    if (!m) throw new Error(`[director] unknown mark "${at}"`);
    return m;
  }

  private async run(cue: Cue): Promise<void> {
    const w = this.host.world;
    const d = (s: number | undefined, def: number) => (this.instant ? 0 : (s ?? def));
    switch (cue.do) {
      case 'location':
        w.show(cue.id, cue.state ?? null, cue.variant ?? null);
        return;
      case 'cast':
        for (const a of cue.actors) {
          const p = this.place(a.at);
          const actor = w.spawn(a.id, p.x, p.z, a.facing ?? p.facing ?? 'front');
          if (a.emotion) actor.emotion = a.emotion;
        }
        return;
      case 'remove':
        w.despawn(cue.actor);
        return;
      case 'shot':
        await w.setShot(cue.shot, d(cue.dur, 1));
        return;
      case 'move': {
        const a = w.actor(cue.actor);
        if (!a) throw new Error(`[director] no actor "${cue.actor}" on stage`);
        const p = this.place(cue.to);
        a.running = !!cue.run;
        if (this.instant) a.place(p.x, p.z, a.facing);
        else await a.moveTo(p.x, p.z, cue.speed ?? 1.3);
        a.running = false;
        return;
      }
      case 'turn':
        w.actor(cue.actor)?.turn(cue.facing);
        return;
      case 'emote': {
        const a = w.actor(cue.actor);
        if (a) a.emotion = cue.emotion;
        return;
      }
      case 'line': {
        if (this.instant) {
          await this.host.caption(cue.speaker ?? null, cue.text, 0);
          return;
        }
        w.setSpeaker(cue.speaker ?? null);
        const shown = this.host.caption(cue.speaker ?? null, cue.text, cue.dur ?? captionTime(cue.text));
        const self = this;
        await new Promise<void>((resolve) => {
          let finished = false;
          const end = () => {
            if (finished) return;
            finished = true;
            if (self.hurry === end) self.hurry = null;
            resolve();
          };
          this.hurry = end;
          void shown.then(end);
        });
        w.setSpeaker(null);
        return;
      }
      case 'sfx':
        if (!this.instant) this.host.sfx(cue.sound);
        return;
      case 'music':
        this.host.music(cue.track);
        return;
      case 'fade':
        await this.host.overlay('fade', { to: cue.to }, d(cue.dur, 0.6));
        return;
      case 'flash':
        if (!this.instant) await this.host.overlay('flash', { color: cue.color ?? '#ffffff' }, cue.dur ?? 0.25);
        return;
      case 'shake':
        if (!this.instant) await this.host.overlay('shake', { strength: cue.strength ?? 1 }, cue.dur ?? 0.5);
        return;
      case 'letterbox':
        await this.host.overlay('letterbox', { on: cue.on }, d(undefined, 0.5));
        return;
      case 'wait':
        await this.hold(cue.dur);
        return;
      case 'until': {
        // not cut short by clicks: the music decides when this scene ends
        const left = cue.t - (performance.now() - this.started) / 1000;
        if (!this.instant && left > 0) await new Promise((r) => window.setTimeout(r, left * 1000));
        return;
      }
      case 'screen':
        w.setScreen(cue.state);
        return;
      case 'light':
        w.show(w.locationName!, cue.state, w.currentVariant);
        return;
      case 'actorFx': {
        const a = w.actor(cue.actor);
        if (!a) throw new Error(`[director] no actor "${cue.actor}" on stage`);
        await a.effect(cue.fx, d(cue.dur, 1), cue.to ? this.place(cue.to) : undefined);
        return;
      }
      case 'prop':
        await this.host.prop(cue.name, cue.action, d(cue.dur, 1), cue.target);
        return;
      case 'par':
        await Promise.all(cue.cues.map((c) => this.run(c)));
        return;
    }
  }
}

export { wait as directorWait };

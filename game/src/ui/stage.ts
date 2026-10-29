// Draws StageState: painted location (SceneView), space/phase theme and the
// cast. Melody's VN poses come from her sprite sheets; everyone else is a
// generated pixel character, scaled by a whole number so pixels stay square,
// animated (breathing, talking) and grounded with a contact shadow.
import { backgrounds, characters } from '../content';
import type { SheetPose } from '../content/characters';
import type { StageState, StagedCharacter } from '../core/types';
import { loadImage } from '../platform/assets';
import { SPRITE_H, SPRITE_W, spriteFrame, type Emotion } from '../render/sprites';
import { el } from './dom';
import { SceneView } from './scene-view';
import { VIEW_W } from '../render/painter';

function sheetSprite(pose: SheetPose, referenceHeight: number, maxFrameWidth: number): HTMLElement {
  const { frame, sheet } = pose;
  const node = el('div', { class: 'sprite sprite-sheet', dataset: { frameRatio: (frame.w / frame.h).toFixed(4) } });
  // One pixel scale per character: limited by the stage height (taller screens) or by the
  // stage width (phones). Width follows from aspect-ratio, so proportions never change.
  const byHeight = (frame.h / referenceHeight).toFixed(4);
  const byWidth = (frame.h / maxFrameWidth).toFixed(4);
  Object.assign(node.style, {
    height: `min(calc(var(--sprite-height) * ${byHeight}), calc(var(--sprite-max-width) * ${byWidth}))`,
    aspectRatio: `${frame.w} / ${frame.h}`,
    backgroundImage: `url("${pose.src}")`,
    backgroundSize: `${((sheet.w / frame.w) * 100).toFixed(3)}% ${((sheet.h / frame.h) * 100).toFixed(3)}%`,
    backgroundPosition: `${sheet.w === frame.w ? 0 : ((frame.x / (sheet.w - frame.w)) * 100).toFixed(3)}% ${
      sheet.h === frame.h ? 0 : ((frame.y / (sheet.h - frame.h)) * 100).toFixed(3)
    }%`,
    transform: `translateY(${(((frame.h - pose.baseline) / frame.h) * 100).toFixed(2)}%)`,
  });
  loadImage(pose.src).catch(() => {
    node.classList.add('sprite-error');
    node.textContent = 'Спрайт не загрузился';
  });
  return node;
}

function widestFrame(charId: string): number {
  const poses = Object.values(characters[charId]?.poses ?? {});
  return Math.max(1, ...poses.map((p) => (p.kind === 'sheet' ? p.frame.w : 0)));
}

/** A live pixel character: one small canvas redrawn on animation frames. */
class PixelActor {
  readonly node: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private breath: 0 | 1 = 0;
  private mouth = false;
  talking = false;

  constructor(
    readonly id: string,
    public emotion: Emotion,
  ) {
    this.node = el('canvas', { class: 'sprite sprite-pixel', width: SPRITE_W, height: SPRITE_H, dataset: { character: id } });
    this.ctx = this.node.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.draw();
  }

  tick(beat: number): void {
    const breath = (Math.floor(beat / 6) % 2) as 0 | 1;
    const mouth = this.talking && beat % 2 === 0;
    if (breath === this.breath && mouth === this.mouth) return;
    this.breath = breath;
    this.mouth = mouth;
    this.draw();
  }

  draw(): void {
    this.ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
    this.ctx.drawImage(spriteFrame(this.id, { facing: 'front', emotion: this.emotion, walk: -1, breath: this.breath, mouthOpen: this.mouth }), 0, 0);
  }
}

export class Stage {
  readonly root: HTMLElement;
  private readonly scene = new SceneView();
  private readonly cast: HTMLElement;
  private readonly nodes = new Map<string, { pose: string; node: HTMLElement; actor?: PixelActor }>();
  private beat = 0;
  private readonly ticker: number;
  private speaker: string | null = null;
  private readonly resize: ResizeObserver;

  constructor() {
    this.cast = el('div', { class: 'stage-cast' });
    this.root = el('div', { class: 'stage' }, this.scene.root, this.cast);
    this.ticker = window.setInterval(() => {
      this.beat++;
      for (const { actor } of this.nodes.values()) actor?.tick(this.beat);
    }, 110);
    // Whole-number pixel scale for generated characters, from the cast area size.
    this.resize = new ResizeObserver(() => {
      const h = this.cast.clientHeight;
      const w = this.cast.clientWidth;
      // Never more than twice the background's pixel size, so people stay in scale with the room.
      const bgScale = this.root.clientWidth / VIEW_W;
      const scale = Math.max(2, Math.min(Math.floor((h * 0.9) / SPRITE_H), Math.floor((w * 0.3) / SPRITE_W), Math.round(bgScale * 2)));
      this.cast.style.setProperty('--px-scale', String(scale));
    });
    this.resize.observe(this.cast);
  }

  destroy(): void {
    window.clearInterval(this.ticker);
    this.resize.disconnect();
    this.scene.destroy();
  }

  /** Marks who is talking (mouth animation) while the line is typed. */
  setSpeaking(id: string | null): void {
    this.speaker = id;
    for (const [cid, entry] of this.nodes) if (entry.actor) entry.actor.talking = cid === id;
  }

  render(stage: Readonly<StageState>, themeRoot: HTMLElement, reduceMotion = false): void {
    themeRoot.dataset.space = stage.space;
    themeRoot.dataset.phase = stage.phase;
    const bg = stage.background ? backgrounds[stage.background] : undefined;
    this.scene.show(stage.background, stage.lighting, stage.variant, reduceMotion, bg?.placeholder);

    const present = new Set(stage.characters.map((c) => c.id));
    for (const [id, entry] of this.nodes) {
      if (!present.has(id)) {
        entry.node.remove();
        this.nodes.delete(id);
      }
    }
    stage.characters.forEach((c: StagedCharacter) => {
      let entry = this.nodes.get(c.id);
      if (!entry || entry.pose !== c.pose) {
        const made = this.makeSprite(c.id, c.pose);
        const slot = el('div', { class: 'cast-slot', dataset: { character: c.id, kind: made.actor ? 'pixel' : 'sheet' } }, made.node);
        if (entry) entry.node.replaceWith(slot);
        else this.cast.append(slot);
        entry = { pose: c.pose, node: slot, ...(made.actor ? { actor: made.actor } : {}) };
        if (entry.actor) entry.actor.talking = this.speaker === c.id;
        this.nodes.set(c.id, entry);
      }
      entry.node.dataset.position = c.position;
      entry.node.dataset.fx = c.fx ?? '';
    });
  }

  private makeSprite(charId: string, poseId: string): { node: HTMLElement; actor?: PixelActor } {
    const def = characters[charId];
    const pose = def?.poses[poseId];
    if (!def || !pose) {
      console.error(`[stage] unknown character/pose ${charId}/${poseId}`);
      return { node: el('div', { class: 'sprite sprite-error' }, `Нет позы ${charId}/${poseId}`) };
    }
    if (pose.kind === 'sheet') return { node: sheetSprite(pose, def.referenceHeight ?? pose.frame.h, widestFrame(charId)) };
    const actor = new PixelActor(charId, pose.emotion);
    return { node: actor.node, actor };
  }
}

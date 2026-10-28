// Draws StageState: background, space/phase theme and character sprites.
// Layer order follows the art brief: background → characters → (dialogue UI
// is a sibling above). A future 3D/pixel background renderer plugs in here.
import { backgrounds, characters } from '../content';
import type { Pose, SheetPose } from '../content/characters';
import type { StageState, StagedCharacter } from '../core/types';
import { loadImage } from '../platform/assets';
import { el } from './dom';

function sheetSprite(pose: SheetPose, referenceHeight: number): HTMLElement {
  const { frame, sheet } = pose;
  const node = el('div', { class: 'sprite sprite-sheet' });
  const scale = frame.h / referenceHeight;
  Object.assign(node.style, {
    height: `calc(var(--sprite-height) * ${scale.toFixed(4)})`,
    aspectRatio: `${frame.w} / ${frame.h}`,
    backgroundImage: `url("${pose.src}")`,
    backgroundSize: `${((sheet.w / frame.w) * 100).toFixed(3)}% ${((sheet.h / frame.h) * 100).toFixed(3)}%`,
    backgroundPosition: `${sheet.w === frame.w ? 0 : ((frame.x / (sheet.w - frame.w)) * 100).toFixed(3)}% ${
      sheet.h === frame.h ? 0 : ((frame.y / (sheet.h - frame.h)) * 100).toFixed(3)
    }%`,
    // Put the bust's cut-off line on the stage floor; anything below hides behind the dialogue box.
    transform: `translateY(${(((frame.h - pose.baseline) / frame.h) * 100).toFixed(2)}%)`,
  });
  loadImage(pose.src).catch(() => {
    node.classList.add('sprite-error');
    node.textContent = 'Спрайт не загрузился';
  });
  return node;
}

function renderPose(charId: string, poseId: string): HTMLElement {
  const def = characters[charId];
  const pose: Pose | undefined = def?.poses[poseId];
  if (!def || !pose) {
    console.error(`[stage] unknown character/pose ${charId}/${poseId}`);
    return el('div', { class: 'sprite sprite-placeholder sprite-error' }, `Нет позы ${charId}/${poseId}`);
  }
  if (pose.kind === 'sheet') return sheetSprite(pose, def.referenceHeight ?? pose.frame.h);
  return el(
    'div',
    { class: 'sprite sprite-placeholder', title: pose.note },
    el('span', { class: 'placeholder-name pixel' }, def.name),
    el('span', { class: 'placeholder-note' }, pose.note),
  );
}

export class Stage {
  readonly root: HTMLElement;
  private readonly bg: HTMLElement;
  private readonly cast: HTMLElement;
  private readonly nodes = new Map<string, { pose: string; node: HTMLElement }>();

  constructor() {
    this.bg = el('div', { class: 'stage-bg' });
    this.cast = el('div', { class: 'stage-cast' });
    this.root = el('div', { class: 'stage' }, this.bg, this.cast);
  }

  render(stage: Readonly<StageState>, themeRoot: HTMLElement): void {
    themeRoot.dataset.space = stage.space;
    themeRoot.dataset.phase = stage.phase;

    const bg = stage.background ? backgrounds[stage.background] : undefined;
    this.bg.dataset.bg = stage.background ?? '';
    this.bg.replaceChildren(bg?.placeholder ? el('span', { class: 'bg-placeholder-label' }, bg.placeholder) : '');
    this.bg.style.backgroundImage = bg?.src ? `url("${bg.src}")` : '';

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
        const slot = el('div', { class: 'cast-slot', dataset: { character: c.id } }, renderPose(c.id, c.pose));
        if (entry) entry.node.replaceWith(slot);
        else this.cast.append(slot);
        entry = { pose: c.pose, node: slot };
        this.nodes.set(c.id, entry);
      }
      entry.node.dataset.position = c.position;
    });
  }
}

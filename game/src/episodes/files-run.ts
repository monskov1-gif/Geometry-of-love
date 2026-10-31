// One stage of «Системные файлы» as a pure state machine (no DOM, no timers):
// the episode feeds it the player's actions and elapsed time and shows the
// events it returns. A mistake that would erase someone else's file, too
// many order mistakes, an expired lock or a path left after the last
// allowed cut restarts the current stage; nothing is ever skipped.
import type { Emotion } from '../render/sprites/humans';
import { allDameoLinksCut, checkCut, DAMEO, findPath, ownedFiles, ownedLinkFiles, WORLD } from './files-graph';
import { label, type Stage } from './files-stages';
import { makeLock, type Lock } from './files-lock';

export const MAX_STRIKES = 3;
/** Stage 3: a lock appears after this many cuts. */
export const LOCK_AT = [2, 4, 6];
export const LOCK_LENGTHS = [3, 3, 4];

export interface RunEvent {
  tone: 'info' | 'good' | 'bad' | 'reset' | 'done';
  text: string;
  emotion: Emotion;
}

const say = (tone: RunEvent['tone'], text: string, emotion: Emotion = 'neutral'): RunEvent => ({ tone, text, emotion });

export class StageRun {
  cut = new Set<string>();
  tags = new Set<string>();
  strikes = 0;
  cutsMade = 0;
  locksUsed = 0;
  lock: Lock | null = null;
  /** Link restored by the last lock (highlighted by the view). */
  relinked: string | null = null;
  done = false;
  /** Restarts of this stage so far. */
  restarts = 0;

  constructor(
    readonly stage: Stage,
    private readonly rand: () => number = Math.random,
  ) {}

  private reset(text: string): RunEvent {
    this.cut.clear();
    this.tags.clear();
    this.strikes = 0;
    this.cutsMade = 0;
    this.locksUsed = 0;
    this.lock = null;
    this.relinked = null;
    this.restarts++;
    return say('reset', text, 'scared');
  }

  private finish(text: string): RunEvent {
    this.done = true;
    return say('done', text, 'happy');
  }

  /** Stage 1: mark / unmark a link file as Dameo's. */
  toggleTag(nodeId: string): void {
    if (this.stage.kind !== 'trace' || this.done) return;
    if (this.stage.nodes.find((n) => n.id === nodeId)?.kind !== 'link') return;
    if (!this.tags.delete(nodeId)) this.tags.add(nodeId);
  }

  /** Stage 1: check the marks. */
  submitTags(): RunEvent {
    const mine = ownedLinkFiles(this.stage);
    const extra = [...this.tags].filter((id) => !mine.has(id)).length;
    const missing = [...mine].filter((id) => !this.tags.has(id)).length;
    if (!extra && !missing) return this.finish('Калькулятор: «Да. Это всё твоё. Четыре связки — и все держатся на тебе. Дальше будет сложнее». 8-)');
    const parts = [extra ? `чужих помечено: ${extra}` : '', missing ? `твоих пропущено: ${missing}` : ''].filter(Boolean).join(', ');
    return this.reset(`Калькулятор: «Нет — ${parts}. Снимаю все метки, проследи провода заново, от user_07.usr».`);
  }

  /** Stages 2–4: try to cut a link. */
  tryCut(linkId: string): RunEvent {
    const { stage } = this;
    if (this.done || this.cut.has(linkId) || stage.kind === 'trace') return say('info', '');
    const link = stage.links.find((l) => l.id === linkId)!;
    if (this.lock && (link.from === this.lock.node || link.to === this.lock.node)) {
      return say('bad', `Калькулятор: «${label(this.lock.node)} заперт. Сначала замок — решай примеры!»`, 'scared');
    }
    const check = checkCut(stage, this.cut, linkId, stage.kind !== 'separate');
    if (check.result === 'wrong') {
      const from = stage.nodes.find((n) => n.id === link.from)!;
      return this.reset(
        from.kind === 'system'
          ? `Калькулятор: «Стой! Это связь самой программы: ${label(link.from)} держится за ${label(link.to)}. Я откатил этап — начни заново».`
          : `Калькулятор: «Стой! Это не твоя нить — на ней держится ${check.victims.map(label).join(', ')}, а с ним кусок мира. Я откатил этап — начни заново».`,
      );
    }
    if (check.result === 'blocked') {
      this.strikes++;
      if (this.strikes >= MAX_STRIKES) return this.reset('Калькулятор: «Три ошибки порядка. Связи перепутались — откатываю этап. Начинай от себя, от user_07.usr».');
      return say('bad', `Калькулятор: «Рано: на ${label(link.from)} ещё держится ${check.waitingFor.map(label).join(', ')}. Ошибка порядка ${this.strikes} из ${MAX_STRIKES}».`, 'scared');
    }
    this.cut.add(linkId);
    this.cutsMade++;
    this.relinked = null;
    if (stage.kind === 'separate') return this.afterSeparateCut();
    if (stage.kind === 'unstable' && this.locksUsed < LOCK_AT.length && this.cutsMade >= LOCK_AT[this.locksUsed]!) return this.spawnLock();
    if (allDameoLinksCut(stage, this.cut) && !this.lock) return this.finish('Калькулятор: «Все твои нити здесь разрезаны. Ни одной чужой. Идём глубже».');
    return say('good', `Калькулятор: «Разорвано: ${label(link.from)} → ${label(link.to)}. Дальше».`);
  }

  private afterSeparateCut(): RunEvent {
    const budget = this.stage.budget ?? 0;
    if (!findPath(this.stage, this.cut)) return this.finish('Калькулятор: «Путей нет. user_07.usr больше не держится за world.map. Привязка снята». 8-)');
    if (this.cut.size >= budget) {
      return this.reset(`Калькулятор: «Разрывов больше нет, а путь от user_07.usr до world.map остался. Система не выдержит ещё одного — откатываю этап».`);
    }
    return say('good', `Калькулятор: «Разрывов: ${this.cut.size} из ${budget}. Путь ещё есть — ищи узкое место».`);
  }

  private spawnLock(): RunEvent {
    const owned = ownedFiles(this.stage);
    // lock a file of Dameo's that still has uncut links: the player has to come back to it
    const open = [...owned].filter((id) => this.stage.links.some((l) => (l.from === id || l.to === id) && owned.has(l.from) && !this.cut.has(l.id)));
    const cutOwned = this.stage.links.filter((l) => this.cut.has(l.id));
    const restored = cutOwned[Math.floor(this.rand() * cutOwned.length)]!;
    this.cut.delete(restored.id);
    this.relinked = restored.id;
    const pool = open.length ? open : [restored.from];
    const node = pool[Math.floor(this.rand() * pool.length)]!;
    this.lock = makeLock(node, LOCK_LENGTHS[this.locksUsed]!, this.rand);
    this.locksUsed++;
    return say(
      'bad',
      `ПРОГРАММА: связь ${label(restored.from)} → ${label(restored.to)} восстановлена, ${label(node)} заперт. Калькулятор: «Замок просит контрольные цифры. Я дам примеры — ответы вводи по порядку!»`,
      'scared',
    );
  }

  /** Stage 3: one digit typed into the lock. */
  typeDigit(digit: string): RunEvent {
    const lock = this.lock;
    if (!lock) return say('info', '');
    const next = lock.typed + digit;
    if (!lock.answer.startsWith(next)) {
      lock.typed = '';
      return say('bad', 'Калькулятор: «Не та цифра — замок сбросил ввод. Ещё раз, с первого примера».', 'scared');
    }
    lock.typed = next;
    if (next.length < lock.answer.length) return say('info', `Калькулятор: «Верно. Дальше: ${lock.problems[next.length]}».`);
    this.lock = null;
    if (allDameoLinksCut(this.stage, this.cut)) return this.finish('Калькулятор: «Замок снят, и все твои нити здесь разрезаны. Идём дальше».');
    return say('good', `Калькулятор: «Замок снят. ${label(lock.node)} снова можно резать».`, 'happy');
  }

  /** Stage 3: time passes; an expired lock restores everything. */
  tick(dt: number): RunEvent | null {
    if (!this.lock || this.done) return null;
    this.lock.left -= dt;
    if (this.lock.left > 0) return null;
    return this.reset('ПРОГРАММА: все связи восстановлены. Калькулятор: «Не успели — замок откатил всё. Начинаем этап заново».');
  }

  /** Stage 4: a remaining path user_07 → world.map (link ids), for the «Трассировка» button. */
  trace(): string[] | null {
    return findPath(this.stage, this.cut, WORLD, DAMEO);
  }
}

import { resolveTarget } from './runtime';
import type { Condition, Effect, Step, Story } from './types';

/** Ids that story content may reference. Built from the content registries. */
export interface ContentIndex {
  characters: Record<string, readonly string[]>; // id -> pose ids
  backgrounds: readonly string[];
  episodes: readonly string[];
  /** Cutscene ids the Director knows (absent = not checked). */
  cutscenes?: readonly string[];
  /** Lighting states each painted background supports (absent = CSS background, no lighting). */
  lightings?: Record<string, readonly string[]>;
  tracks?: readonly string[];
  sounds?: readonly string[];
  endings: readonly string[];
  flags: readonly string[];
  relationships: readonly string[];
  traits: readonly string[];
}

/**
 * Static checks over the whole story. Returns human-readable problems;
 * an empty array means the content is consistent. Run by the unit tests,
 * so broken references fail CI instead of failing mid-playthrough.
 */
export function validateStory(story: Story, index: ContentIndex): string[] {
  const problems: string[] = [];
  const has = (list: readonly string[], id: string) => list.includes(id);

  if (!story.scenes[story.startScene]) problems.push(`startScene "${story.startScene}" does not exist`);

  const checkTarget = (where: string, target: string) => {
    try {
      resolveTarget(story, target);
    } catch (e) {
      problems.push(`${where}: ${(e as Error).message}`);
    }
  };

  const checkCondition = (where: string, c: Condition): void => {
    if ('all' in c) c.all.forEach((x) => checkCondition(where, x));
    else if ('any' in c) c.any.forEach((x) => checkCondition(where, x));
    else if ('not' in c) checkCondition(where, c.not);
    else if ('flag' in c) {
      if (!has(index.flags, c.flag)) problems.push(`${where}: undeclared flag "${c.flag}"`);
    } else if ('relationship' in c) {
      if (!has(index.relationships, c.relationship)) problems.push(`${where}: undeclared relationship "${c.relationship}"`);
    } else if (!has(index.traits, c.trait)) problems.push(`${where}: undeclared trait "${c.trait}"`);
  };

  const checkEffect = (where: string, e: Effect): void => {
    if ('setFlag' in e) {
      if (!has(index.flags, e.setFlag)) problems.push(`${where}: undeclared flag "${e.setFlag}"`);
    } else if ('relationship' in e) {
      if (!has(index.relationships, e.relationship)) problems.push(`${where}: undeclared relationship "${e.relationship}"`);
    } else if (!has(index.traits, e.trait)) problems.push(`${where}: undeclared trait "${e.trait}"`);
  };

  const checkSpeaker = (where: string, id: string) => {
    if (!index.characters[id]) problems.push(`${where}: unknown character "${id}"`);
  };

  for (const [key, scene] of Object.entries(story.scenes)) {
    if (scene.id !== key) problems.push(`scene key "${key}" does not match id "${scene.id}"`);
    if (scene.steps.length === 0) {
      problems.push(`scene "${key}" has no steps`);
      continue;
    }
    const labels = new Set<string>();
    scene.steps.forEach((step: Step, i) => {
      const where = `${key}:${i} (${step.type})`;
      switch (step.type) {
        case 'say':
          if (step.speaker) checkSpeaker(where, step.speaker);
          if (!step.text.trim()) problems.push(`${where}: empty text`);
          break;
        case 'show': {
          const poses = index.characters[step.character];
          if (!poses) problems.push(`${where}: unknown character "${step.character}"`);
          else if (!poses.includes(step.pose)) problems.push(`${where}: unknown pose "${step.pose}" for "${step.character}"`);
          break;
        }
        case 'hide':
          checkSpeaker(where, step.character);
          break;
        case 'background': {
          if (!has(index.backgrounds, step.background)) problems.push(`${where}: unknown background "${step.background}"`);
          const ls = index.lightings?.[step.background];
          if (step.lighting && ls && !ls.includes(step.lighting)) problems.push(`${where}: "${step.background}" has no lighting "${step.lighting}"`);
          break;
        }
        case 'music':
          if (step.track && index.tracks && !has(index.tracks, step.track)) problems.push(`${where}: unknown music track "${step.track}"`);
          break;
        case 'sfx':
          if (index.sounds && !has(index.sounds, step.sound)) problems.push(`${where}: unknown sound "${step.sound}"`);
          break;
        case 'light':
          break;
        case 'label':
          if (labels.has(step.name)) problems.push(`${where}: duplicate label "${step.name}"`);
          labels.add(step.name);
          break;
        case 'effects':
          step.effects.forEach((e) => checkEffect(where, e));
          break;
        case 'choice': {
          if (step.options.length === 0) problems.push(`${where}: choice without options`);
          const ids = new Set<string>();
          for (const o of step.options) {
            if (ids.has(o.id)) problems.push(`${where}: duplicate option id "${o.id}"`);
            ids.add(o.id);
            o.effects?.forEach((e) => checkEffect(where, e));
            if (o.condition) checkCondition(where, o.condition);
            if (o.goto) checkTarget(where, o.goto);
          }
          // A hub ("talk to whoever is left") may make every option conditional
          // only if a branch right before it leaves once all are used up.
          const guarded = scene.steps[i - 1]?.type === 'branch';
          if (step.options.every((o) => o.condition) && !guarded) {
            problems.push(`${where}: every option is conditional — the player could be left with no choice`);
          }
          break;
        }
        case 'branch':
          checkCondition(where, step.if);
          checkTarget(where, step.goto);
          break;
        case 'goto':
          checkTarget(where, step.target);
          break;
        case 'episode':
          if (!has(index.episodes, step.episode)) problems.push(`${where}: unknown episode "${step.episode}"`);
          break;
        case 'ending':
          if (!has(index.endings, step.ending)) problems.push(`${where}: unknown ending "${step.ending}"`);
          break;
        case 'cutscene':
          if (index.cutscenes && !has(index.cutscenes, step.cutscene)) problems.push(`${where}: unknown cutscene "${step.cutscene}"`);
          break;
        case 'card':
          if (!step.card.title.trim()) problems.push(`${where}: chapter card without a title`);
          if (step.card.backdrop && !has(index.backgrounds, step.card.backdrop)) problems.push(`${where}: unknown card backdrop "${step.card.backdrop}"`);
          break;
        case 'screen':
          if (step.notify?.some((t) => !t.trim())) problems.push(`${where}: empty notification text`);
          if (step.view === undefined && !step.notify?.length && !step.clear) problems.push(`${where}: screen step changes nothing`);
          break;
        case 'space':
        case 'effect':
        case 'shot':
          break;
      }
    });
    const last = scene.steps[scene.steps.length - 1]!;
    const terminates =
      last.type === 'goto' ||
      last.type === 'ending' ||
      (last.type === 'choice' && last.options.every((o) => o.goto));
    if (!terminates) problems.push(`scene "${key}" must end with goto, ending, or a choice whose options all jump`);
  }
  return problems;
}

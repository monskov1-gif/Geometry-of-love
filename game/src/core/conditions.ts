import type { Condition, Effect, StoryState } from './types';

type VariableState = Pick<StoryState, 'flags' | 'relationships' | 'traits'>;

function inRange(value: number, gte?: number, lte?: number): boolean {
  if (gte !== undefined && value < gte) return false;
  if (lte !== undefined && value > lte) return false;
  return true;
}

export function evaluate(condition: Condition, state: VariableState): boolean {
  if ('all' in condition) return condition.all.every((c) => evaluate(c, state));
  if ('any' in condition) return condition.any.some((c) => evaluate(c, state));
  if ('not' in condition) return !evaluate(condition.not, state);
  if ('flag' in condition) return (state.flags[condition.flag] ?? false) === (condition.is ?? true);
  if ('relationship' in condition) {
    return inRange(state.relationships[condition.relationship] ?? 0, condition.gte, condition.lte);
  }
  return inRange(state.traits[condition.trait] ?? 0, condition.gte, condition.lte);
}

/** Applies effects immutably and returns the new variable maps. */
export function applyEffects<T extends VariableState>(state: T, effects: readonly Effect[]): T {
  const flags = { ...state.flags };
  const relationships = { ...state.relationships };
  const traits = { ...state.traits };
  for (const effect of effects) {
    if ('setFlag' in effect) flags[effect.setFlag] = effect.value ?? true;
    else if ('relationship' in effect) {
      relationships[effect.relationship] = (relationships[effect.relationship] ?? 0) + effect.add;
    } else traits[effect.trait] = (traits[effect.trait] ?? 0) + effect.add;
  }
  return { ...state, flags, relationships, traits };
}

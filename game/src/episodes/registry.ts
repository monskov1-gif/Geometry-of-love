import { geometryQuiz } from './geometry-quiz';
import { horizontalWalk } from './horizontal-walk';
import type { EpisodeDefinition } from './types';

// Register new mini-games and interactive cutscenes here.
export const episodes: Record<string, EpisodeDefinition> = {
  [geometryQuiz.id]: geometryQuiz,
  [horizontalWalk.id]: horizontalWalk,
};

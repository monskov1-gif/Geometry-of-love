import { chase } from './chase';
import { exitClimb } from './exit-climb';
import { geometryQuiz } from './geometry-quiz';
import { horizontalWalk } from './horizontal-walk';
import { rulerBridge } from './ruler-bridge';
import { systemFiles } from './system-files';
import type { EpisodeDefinition } from './types';

// Register new mini-games and interactive cutscenes here.
export const episodes: Record<string, EpisodeDefinition> = Object.fromEntries(
  [geometryQuiz, horizontalWalk, exitClimb, rulerBridge, systemFiles, chase].map((e) => [e.id, e]),
);

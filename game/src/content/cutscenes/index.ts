// Staged scenes for the Cutscene Director (world/director.ts). Each one follows
// a moment the synopsis names; what the camera and the actors do is direction
// (docs/CUTSCENES.md), not new story.
import type { Cutscene } from '../../world/director';
import { pulledIn } from './pulled-in';
import { melodyTransforms } from './melody-transforms';
import { melodyLeaves } from './melody-leaves';
import { erasureDetails, erasureFace, erasureGone, erasureLimbs } from './erasure';

export const cutscenes: Record<string, Cutscene> = Object.fromEntries(
  [pulledIn, melodyTransforms, melodyLeaves, erasureDetails, erasureFace, erasureLimbs, erasureGone].map((c) => [c.id, c]),
);

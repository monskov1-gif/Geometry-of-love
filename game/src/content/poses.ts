// How a story pose maps onto the in-world pixel figure. Pixel characters'
// poses are emotions already; Melody's portrait poses get the closest emotion
// for her figure inside 3D scenes (her portrait still shows the exact pose).
import type { Emotion } from '../render/sprites';
import { characters } from './characters';

const SHEET_EMOTION: Record<string, Emotion> = {
  cheerful: 'happy',
  neutral: 'neutral',
  angry: 'angry',
  'arms-crossed': 'neutral',
};

export function poseEmotion(charId: string, poseId: string): Emotion {
  const pose = characters[charId]?.poses[poseId];
  if (!pose) return 'neutral';
  return pose.kind === 'pixel' ? pose.emotion : (SHEET_EMOTION[poseId] ?? 'neutral');
}

import type { Scene, Story } from '../../core/types';
import { chapter1, chapter2, chapter2Day2, chapter2Day3, chapter2Day4, chapter3, chapter4, endingSelfTaught } from './act1';
import { chapter5, chapter6, chapter7, chapter8, chapter9, endingFavoriteStudent } from './act2';
import { chapter10, chapter11, chapter12, chapter13, chapter14, chapter15, epilogue } from './act3';

// The whole story, in reading order. Add new scene modules here.
const scenes: Scene[] = [
  chapter1,
  endingSelfTaught,
  chapter2,
  chapter2Day2,
  chapter2Day3,
  chapter2Day4,
  chapter3,
  chapter4,
  chapter5,
  chapter6,
  chapter7,
  chapter8,
  chapter9,
  endingFavoriteStudent,
  chapter10,
  chapter11,
  chapter12,
  chapter13,
  chapter14,
  chapter15,
  epilogue,
];

export const story: Story = {
  startScene: chapter1.id,
  scenes: Object.fromEntries(scenes.map((s) => [s.id, s])),
};

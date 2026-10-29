// Light states of the candy world. 'day' is the loud default; 'dim' is the
// Sandbox frozen (chapter 6, 'sandbox-dim'): greyed lavender light, the music
// gone; 'glitch' is the later phases (D–E): plum dark, a green code light, and
// glitch slices over the walls. Locations pass these to `new LocationKit(root, { ambient })`
// and add their coloured lamps per state.
import type { SkyMood } from './textures';

export const CANDY_STATES = ['day', 'dim', 'glitch'] as const;

export const CANDY_AMBIENT = {
  day: { sky: 0xfff4fb, ground: 0xb890d8, hemi: 1.1, fill: 0xfff0e0, fillI: 0.75, bg: 0x9fdcff },
  dim: { sky: 0xb8b4c4, ground: 0x4a4458, hemi: 0.8, fill: 0xc8c4d8, fillI: 0.3, bg: 0x7a7490 },
  glitch: { sky: 0x8a6aa8, ground: 0x180c20, hemi: 0.6, fill: 0x60ffa0, fillI: 0.3, bg: 0x1a0c24 },
};

export const moodOf = (state: string): SkyMood => (state === 'dim' || state === 'glitch' ? state : 'day');

/** Lamp levels for colourful accent lights: full by day, low when frozen, a few left in the glitch. */
export const ACCENT_ON = { day: 1, dim: 0.25, glitch: 0.4 };

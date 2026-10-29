// The candy palette of the game world (the Sandbox and its rooms). The art
// brief has no palette for the `game` space; the author asked for "very motley,
// eye-searing, over-detailed" places after the colourful cute references
// (materials/references IMG_5027–5058). The first eight colours are the app's
// tokens (styles/tokens.css); the rest are the louder toy colours around them.
// Used by the 3D locations (world/locations) and the canvas mini-games — this is
// art data like the sprite palettes, not UI colour.

export const CANDY = {
  pink: 0xff6cc5,
  babyPink: 0xffc9f6,
  mint: 0xb2f5e4,
  lemon: 0xf8feb4,
  lavender: 0xdeccff,
  plum: 0x5a3d78,
  paper: 0xfff9fd,
  blue: 0x55c9f5,
  cherry: 0xff4f6d,
  tangerine: 0xff9a3c,
  sunshine: 0xffd93d,
  grass: 0x7ee05a,
  aqua: 0x3fe0d0,
  sky: 0x8fd8ff,
  grape: 0xa66bff,
  bubblegum: 0xff8fd8,
  peach: 0xffc6a0,
  coral: 0xff7a7a,
  lilac: 0xc9a7ff,
  lime: 0xd4ff5a,
  cobalt: 0x4a6cff,
  magenta: 0xe83cff,
} as const;

export type CandyName = keyof typeof CANDY;

/** The loud colours toys and stickers are picked from (no paper, no plum). */
export const LOUD: number[] = [
  CANDY.pink,
  CANDY.blue,
  CANDY.cherry,
  CANDY.tangerine,
  CANDY.sunshine,
  CANDY.grass,
  CANDY.aqua,
  CANDY.grape,
  CANDY.bubblegum,
  CANDY.cobalt,
  CANDY.magenta,
  CANDY.lime,
];

/** Soft pastels for big surfaces, so the loud colours have something to sit on. */
export const PASTEL: number[] = [CANDY.babyPink, CANDY.mint, CANDY.lemon, CANDY.lavender, CANDY.sky, CANDY.peach, CANDY.lilac];

/** Rainbow order for stripes and arcs. */
export const RAINBOW: number[] = [CANDY.cherry, CANDY.tangerine, CANDY.sunshine, CANDY.grass, CANDY.blue, CANDY.cobalt, CANDY.grape];

export const css = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;

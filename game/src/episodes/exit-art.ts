// Art of «Выход»: the training level of «メロディのまほう» — a pastel-candy
// cute educational game. Alphabet blocks, cake ledges, smiling clouds,
// rainbow lifts, triangle tiles, star seats, the app's pop-up windows.
// Colours come from styles/tokens.css (via palette()) plus shades mixed
// from them; pieces are drawn once into cached canvases.
import { mix, rng, shade } from '../render/painter';
import type { Piece } from './exit-course';
import { bitmap, canvas, disc, HEART, HEART_S, LETTERS, outline, poly, px, SPARKLE, STAR, STAR_S, type Ctx } from './exit-pixels';

export interface Pal {
  pink: string;
  baby: string;
  mint: string;
  lemon: string;
  lavender: string;
  ink: string;
  plum: string;
  paper: string;
  gray: string;
  red: string;
  blue: string;
  sky: string;
  orange: string;
  glass: string;
  room: string;
  black: string;
  /** Bright accents cycled over pieces. */
  candy: string[];
  rainbow: string[];
}

export function makePalette(color: (token: string, fallback: string) => string): Pal {
  const pink = color('--pink', '#ff6cc5');
  const baby = color('--baby-pink', '#ffc9f6');
  const mint = color('--mint', '#b2f5e4');
  const lemon = color('--lemon', '#f8feb4');
  const lavender = color('--lavender', '#deccff');
  const red = color('--error-red', '#ff315a');
  const blue = color('--rainbow-blue', '#55c9f5');
  const plum = color('--plum', '#5a3d78');
  const orange = mix(red, lemon, 0.55);
  const mintDeep = shade(mint, -0.18);
  return {
    pink,
    baby,
    mint,
    lemon,
    lavender,
    ink: color('--ink', '#30243b'),
    plum,
    paper: color('--paper', '#fff9fd'),
    gray: color('--system-gray', '#c9c9d2'),
    red,
    blue,
    sky: color('--notebook-blue', '#b8d9f2'),
    orange,
    glass: color('--terminal-black', '#15131b'),
    room: color('--room-teal', '#3c4644'),
    black: color('--reality-shadow', '#242322'),
    candy: [pink, mintDeep, shade(lemon, -0.12), shade(lavender, -0.12), blue, orange],
    rainbow: [red, orange, shade(lemon, -0.06), mintDeep, blue, shade(lavender, -0.2)],
  };
}

/** How far a piece's art reaches below its top (collision is only the top). */
export function artDepth(p: Piece): number {
  switch (p.look) {
    case 'ground':
      return 60;
    case 'block':
      return 24;
    case 'cake':
      return 18;
    case 'cloud':
      return 16;
    case 'lift':
      return 12;
    case 'tri':
      return 11;
    case 'star':
      return 20;
    case 'popup':
      return 22;
    case 'wall':
    case 'glass':
      return p.h;
  }
}

const ink = (c: string) => shade(c, -0.45);

function block(ctx: Ctx, w: number, P: Pal, variant: number): void {
  const h = 24;
  const face = P.candy[variant % P.candy.length]!;
  const panel = shade(face, 0.55);
  px(ctx, 1, 0, w - 2, h, ink(face));
  px(ctx, 0, 1, w, h - 2, ink(face));
  px(ctx, 1, 1, w - 2, h - 2, face);
  px(ctx, 2, 1, w - 4, 1, shade(face, 0.45));
  px(ctx, 1, 2, 1, h - 4, shade(face, 0.3));
  px(ctx, 2, h - 3, w - 4, 2, shade(face, -0.2));
  // letter panels, one per 24 px
  const n = Math.max(1, Math.floor(w / 24));
  const pw = Math.floor(w / n);
  for (let i = 0; i < n; i++) {
    const x = i * pw + 4;
    px(ctx, x, 5, pw - 8, 14, panel);
    px(ctx, x, 5, pw - 8, 1, shade(face, -0.1));
    const letter = LETTERS[(variant + i) % LETTERS.length]!;
    const lc = P.candy[(variant + i + 3) % P.candy.length]!;
    bitmap(ctx, letter, x + Math.floor((pw - 8 - 10) / 2), 7, { x: ink(lc) }, 2);
    bitmap(ctx, letter, x + Math.floor((pw - 8 - 10) / 2) - 1, 6, { x: lc }, 2);
  }
  // studs on top: a toy block
  for (let x = 5; x < w - 6; x += 10) {
    px(ctx, x, -0, 5, 1, shade(face, 0.6));
  }
  bitmap(ctx, HEART_S, w - 6, 2, { x: P.paper });
}

function cake(ctx: Ctx, w: number, P: Pal, variant: number): void {
  const jam = P.candy[variant % 3 === 0 ? 0 : variant % 3 === 1 ? 4 : 5]!;
  // sponge layers
  px(ctx, 0, 3, w, 15, ink(P.lemon));
  px(ctx, 1, 4, w - 2, 13, shade(P.lemon, -0.08));
  px(ctx, 1, 9, w - 2, 2, jam);
  px(ctx, 1, 11, w - 2, 1, shade(jam, -0.25));
  px(ctx, 1, 14, w - 2, 3, shade(P.baby, -0.1));
  for (let x = 3; x < w - 2; x += 7) px(ctx, x, 6, 1, 1, shade(P.lemon, -0.25));
  // frosting with drips
  px(ctx, 0, 0, w, 4, ink(P.paper));
  px(ctx, 1, 0, w - 2, 4, P.paper);
  px(ctx, 2, 0, w - 4, 1, '#ffffff');
  const r = rng(variant * 977 + w);
  for (let x = 2; x < w - 3; x += 5) {
    const d = 1 + Math.floor(r() * 4);
    px(ctx, x, 4, 3, d, P.paper);
    px(ctx, x, 4 + d, 3, 1, shade(P.paper, -0.15));
  }
  // sprinkles
  for (let i = 0; i < w / 4; i++) {
    const c = P.candy[Math.floor(r() * P.candy.length)]!;
    px(ctx, 2 + Math.floor(r() * (w - 5)), 1 + Math.floor(r() * 2), r() < 0.5 ? 2 : 1, 1, c);
  }
  // cherries / hearts on top every ~24 px
  for (let x = 8; x < w - 8; x += 24) bitmap(ctx, HEART_S, x, -3, { x: P.red });
}

function cloud(ctx: Ctx, w: number, P: Pal, variant: number): void {
  const under = shade(P.lavender, -0.05);
  const puffs = Math.max(3, Math.round(w / 14));
  for (let i = 0; i < puffs; i++) {
    const cx = 6 + ((w - 12) * i) / (puffs - 1);
    disc(ctx, cx, 8, 6 + (i % 2), ink(P.lavender));
  }
  for (let i = 0; i < puffs; i++) {
    const cx = 6 + ((w - 12) * i) / (puffs - 1);
    disc(ctx, cx, 8, 5 + (i % 2), under);
    disc(ctx, cx, 7, 4 + (i % 2), P.paper);
  }
  px(ctx, 4, 1, w - 8, 2, P.paper);
  px(ctx, 6, 0, w - 12, 1, '#ffffff');
  // a sleepy smiling face
  const cx = Math.floor(w / 2);
  px(ctx, cx - 6, 7, 2, 1, P.ink);
  px(ctx, cx + 4, 7, 2, 1, P.ink);
  px(ctx, cx - 1, 9, 2, 1, P.ink);
  px(ctx, cx - 9, 9, 3, 1, P.pink);
  px(ctx, cx + 6, 9, 3, 1, P.pink);
  bitmap(ctx, SPARKLE, variant % 2 ? 1 : w - 6, 1, { x: P.lemon, o: '#ffffff' });
}

function lift(ctx: Ctx, w: number, P: Pal): void {
  px(ctx, 0, 0, w, 12, P.ink);
  P.rainbow.forEach((c, i) => px(ctx, 1, 1 + i * 2, w - 2, 2, c));
  px(ctx, 1, 1, w - 2, 1, shade(P.rainbow[0]!, 0.4));
  bitmap(ctx, HEART, Math.floor(w / 2) - 3, 3, { x: P.paper, o: '#ffffff' });
  for (const x of [3, w - 6]) bitmap(ctx, ['xx', 'xx'], x, 5, { x: P.lemon });
}

/** A row of triangle tiles. `crack` 0..1 shows how close it is to breaking. */
function tri(ctx: Ctx, w: number, P: Pal, variant: number, crack: number): void {
  const n = Math.max(2, Math.round(w / 9));
  const tw = w / n;
  for (let i = 0; i < n; i++) {
    const x0 = i * tw;
    const up = (i + variant) % 2 === 0;
    const c = P.candy[(i + variant) % P.candy.length]!;
    const pts: [number, number][] = up
      ? [
          [x0 - tw * 0.5, 11],
          [x0 + tw * 0.5, 0],
          [x0 + tw * 1.5, 11],
        ]
      : [
          [x0, 0],
          [x0 + tw, 0],
          [x0 + tw * 0.5, 11],
        ];
    poly(ctx, pts, ink(c));
    const inset: [number, number][] = pts.map(([x, y]) => [x + (x0 + tw * 0.5 - x) * 0.25, y + (up ? 7 : 3.7 - y) * 0.25]);
    poly(ctx, inset, c);
    px(ctx, x0 + tw * 0.5 - 1, up ? 4 : 2, 2, 1, shade(c, 0.6));
  }
  px(ctx, 0, 0, w, 1, P.paper);
  if (crack > 0.15) {
    const r = rng(variant * 31 + 7);
    const lines = Math.ceil(crack * 5);
    for (let k = 0; k < lines; k++) {
      let x = 2 + r() * (w - 4);
      for (let y = 0; y < 10; y++) {
        px(ctx, x, y, 1, 1, P.ink);
        x += r() < 0.5 ? -1 : 1;
      }
    }
  }
}

function seat(ctx: Ctx, w: number, P: Pal, variant: number): void {
  const c = P.candy[variant % P.candy.length]!;
  px(ctx, 0, 0, w, 6, ink(c));
  px(ctx, 1, 1, w - 2, 4, c);
  px(ctx, 1, 1, w - 2, 1, shade(c, 0.5));
  for (let x = 4; x < w - 3; x += 8) px(ctx, x, 3, 2, 1, P.paper);
  bitmap(ctx, STAR, Math.floor(w / 2) - 9, 4, { x: ink(P.lemon), o: ink(P.lemon) }, 2);
  bitmap(ctx, STAR, Math.floor(w / 2) - 9, 3, { x: shade(P.lemon, -0.05), o: '#ffffff' }, 2);
  px(ctx, Math.floor(w / 2) - 3, 11, 1, 2, P.ink);
  px(ctx, Math.floor(w / 2) + 2, 11, 1, 2, P.ink);
  px(ctx, Math.floor(w / 2) - 5, 14, 2, 1, P.pink);
  px(ctx, Math.floor(w / 2) + 4, 14, 2, 1, P.pink);
}

/** App window frame: title bar with dots and ×, white body. */
function windowFrame(ctx: Ctx, w: number, h: number, P: Pal, bar: string): void {
  px(ctx, 0, 0, w, h, P.ink);
  px(ctx, 1, 1, w - 2, 6, bar);
  px(ctx, 1, 1, w - 2, 1, shade(bar, 0.4));
  px(ctx, 1, 7, w - 2, h - 8, P.paper);
  px(ctx, 3, 3, 2, 2, P.red);
  px(ctx, 6, 3, 2, 2, shade(P.lemon, -0.15));
  px(ctx, 9, 3, 2, 2, shade(P.mint, -0.2));
  bitmap(ctx, ['x.x', '.x.', 'x.x'], w - 5, 3, { x: P.paper });
}

function popup(ctx: Ctx, w: number, P: Pal, variant: number): void {
  const bar = variant % 2 ? P.pink : P.blue;
  windowFrame(ctx, w, 22, P, bar);
  bitmap(ctx, HEART, 4, 10, { x: P.pink, o: '#ffffff' });
  px(ctx, 14, 11, w - 18, 4, P.gray);
  px(ctx, 14, 11, Math.floor((w - 18) * (0.4 + (variant % 3) * 0.2)), 4, shade(P.mint, -0.2));
  bitmap(ctx, STAR_S, 14, 16, { x: shade(P.lemon, -0.2) });
  bitmap(ctx, STAR_S, 20, 16, { x: shade(P.lemon, -0.2) });
  bitmap(ctx, STAR_S, 26, 16, { x: P.gray });
}

function wall(ctx: Ctx, w: number, h: number, P: Pal): void {
  windowFrame(ctx, w, h, P, P.pink);
  for (let y = 12; y < h - 14; y += 14) bitmap(ctx, HEART, Math.floor(w / 2) - 4, y, { x: y % 28 ? P.pink : P.red, o: '#ffffff' });
  px(ctx, w - 4, 9, 2, h - 12, P.gray);
  px(ctx, w - 4, 12, 2, 18, P.plum);
  px(ctx, 4, h - 9, w - 10, 5, P.pink);
  px(ctx, 5, h - 8, w - 12, 1, shade(P.pink, 0.5));
}

function ground(ctx: Ctx, w: number, P: Pal): void {
  const h = 60;
  const r = rng(4242);
  for (let y = 4; y < h; y++)
    for (let x = 0; x < w; x++) {
      const stripe = Math.floor((x + y) / 8) % 3;
      ctx.fillStyle = stripe === 0 ? P.baby : stripe === 1 ? P.paper : shade(P.mint, 0.2);
      ctx.fillRect(x, y, 1, 1);
    }
  for (let i = 0; i < 260; i++) px(ctx, Math.floor(r() * w), 8 + Math.floor(r() * (h - 8)), 2, 1, P.candy[i % P.candy.length]!);
  px(ctx, 0, 0, w, 6, ink(P.pink));
  px(ctx, 0, 0, w, 5, P.pink);
  px(ctx, 0, 0, w, 1, shade(P.pink, 0.5));
  for (let x = 0; x < w; x += 6) {
    const d = 2 + Math.floor(r() * 6);
    px(ctx, x + 1, 5, 4, d, P.pink);
    px(ctx, x + 2, 5 + d, 2, 1, P.pink);
    px(ctx, x + 2, 6, 1, 2, shade(P.pink, 0.4));
  }
}

function glass(ctx: Ctx, w: number, h: number, P: Pal): void {
  px(ctx, 0, 0, w, h, P.glass);
  px(ctx, 0, 0, w, 1, shade(P.glass, 0.35));
  for (let x = -h; x < w; x += 40) for (let k = 0; k < h; k++) px(ctx, x + k, k, 6, 1, shade(P.glass, 0.12));
}

export interface PieceArt {
  img: HTMLCanvasElement;
  /** Offset of the image from the piece's top-left corner. */
  ox: number;
  oy: number;
}

/**
 * Image box of a piece relative to its collision box: one outline pixel on
 * each side, the standing surface on the collision top (toppings of cakes
 * and blocks rise above it), the body hanging below.
 */
export function artFrame(p: Piece): { ox: number; oy: number; w: number; h: number } {
  const top = (p.look === 'cake' || p.look === 'block' ? 3 : 0) + 1; // toppings + outline
  return { ox: -1, oy: -top, w: p.w + 2, h: artDepth(p) + top + 1 };
}

const cache = new Map<string, PieceArt>();

/** Cached art for a piece. `crack` (0..1) only matters for triangle tiles. */
export function pieceArt(p: Piece, P: Pal, crack = 0): PieceArt {
  const stage = p.look === 'tri' ? Math.min(3, Math.floor(crack * 4)) : 0;
  const key = `${p.look}|${p.w}|${p.h}|${p.variant}|${stage}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const frame = artFrame(p);
  const { c, ctx } = canvas(frame.w, frame.h);
  ctx.translate(-frame.ox, -frame.oy);
  switch (p.look) {
    case 'ground':
      ground(ctx, p.w, P);
      break;
    case 'block':
      block(ctx, p.w, P, p.variant);
      break;
    case 'cake':
      cake(ctx, p.w, P, p.variant);
      break;
    case 'cloud':
      cloud(ctx, p.w, P, p.variant);
      break;
    case 'lift':
      lift(ctx, p.w, P);
      break;
    case 'tri':
      tri(ctx, p.w, P, p.variant, stage / 3);
      break;
    case 'star':
      seat(ctx, p.w, P, p.variant);
      break;
    case 'popup':
      popup(ctx, p.w, P, p.variant);
      break;
    case 'wall':
      wall(ctx, p.w, p.h, P);
      break;
    case 'glass':
      glass(ctx, p.w, p.h, P);
      break;
  }
  // dark edges for everything you can stand on (stickers in the sky have light ones)
  if (p.look !== 'ground' && p.look !== 'glass') outline(c, P.ink);
  const art = { img: c, ox: frame.ox, oy: frame.oy };
  cache.set(key, art);
  return art;
}


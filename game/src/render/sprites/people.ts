// People with real proportions (about 7 heads tall) on a 32×80 grid, for the 3D
// scenes where they stand next to real-size furniture. Built from parts like
// the old 24×48 chibi generator, but every surface has three tones lit from
// the upper left, faces have room for real expressions, and the side view has
// a proper walk cycle (contact, pass, contact, pass) with counter-swinging arms.
// Deterministic: the same id and frame always give the same pixels.
import type { Emotion, Frame } from './humans';

export const PERSON_W = 32;
export const PERSON_H = 80;

type Put = (x: number, y: number, c: string) => void;
type Tones = [string, string, string]; // shadow, base, light

export interface PersonSpec {
  skin: Tones;
  hair: Tones;
  eyes: string;
  line: string;
  hairStyle: 'messy' | 'long' | 'low-tail';
  /** Head lowered and shoulders forward (Dameo). */
  slouch: boolean;
  top: 'hoodie' | 'blazer' | 'cardigan';
  topTones: Tones;
  inner: Tones;
  accent: string;
  bottom: 'pants' | 'skirt';
  bottomTones: Tones;
  legs: Tones; // skin or tights under a skirt
  socks?: string;
  shoes: Tones;
  ribbons?: [string, string];
  hairclip?: boolean;
  eyeBags?: boolean;
}

const span = (put: Put, x0: number, x1: number, y: number, c: string) => {
  for (let x = Math.round(x0); x <= Math.round(x1); x++) put(x, y, c);
};

/** Fills a horizontal slab row by row with 3-tone shading: light on the left, shadow on the right. */
function shadedRows(put: Put, rows: [number, number, number][], t: Tones, lightW = 1, shadowW = 2): void {
  for (const [y, x0, x1] of rows) {
    span(put, x0, x1, y, t[1]);
    span(put, x0, Math.min(x1, x0 + lightW - 1), y, t[2]);
    span(put, Math.max(x0, x1 - shadowW + 1), x1, y, t[0]);
  }
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ---------------------------------------------------------------- front view

function headFront(put: Put, s: PersonSpec, hx: number, hy: number): void {
  // 10 wide, 12 tall, rounder at the top, a narrow chin
  const w = [6, 8, 10, 10, 10, 10, 10, 10, 9, 8, 6, 4];
  w.forEach((wi, i) => {
    const x0 = hx - Math.floor(wi / 2);
    span(put, x0, x0 + wi - 1, hy + i, s.skin[1]);
    put(x0 + wi - 1, hy + i, s.skin[0]);
    if (i > 2 && i < 9) put(x0, hy + i, s.skin[2]);
  });
  // ears
  put(hx - 6, hy + 5, s.skin[0]);
  put(hx - 6, hy + 6, s.skin[0]);
  put(hx + 5, hy + 5, s.skin[0]);
  put(hx + 5, hy + 6, s.skin[0]);
  // neck
  for (const y of [hy + 12, hy + 13]) span(put, hx - 2, hx + 1, y, s.skin[0]);
}

function faceFront(put: Put, s: PersonSpec, hx: number, hy: number, e: Emotion, open: boolean): void {
  const ey = hy + 6;
  const L = hx - 4;
  const R = hx + 1;
  const d = s.line;
  const eye = (x: number, mirror: boolean) => {
    switch (e) {
      case 'happy':
        put(x, ey, d);
        put(x + 1, ey - 1, d);
        put(x + 2, ey, d);
        return;
      case 'tired':
        span(put, x, x + 2, ey, d);
        put(x + 1, ey + 1, s.eyes);
        return;
      case 'scared':
        span(put, x, x + 2, ey - 1, d);
        put(x, ey, '#ffffff');
        put(x + 1, ey, s.eyes);
        put(x + 2, ey, '#ffffff');
        span(put, x, x + 2, ey + 1, '#ffffff');
        return;
      default:
        span(put, x, x + 2, ey - 1, d);
        put(x, ey, mirror ? s.eyes : '#ffffff');
        put(x + 1, ey, d);
        put(x + 2, ey, mirror ? '#ffffff' : s.eyes);
        put(x + 1, ey + 1, s.eyes);
    }
  };
  eye(L, false);
  eye(R, true);
  if (s.eyeBags) {
    put(L, ey + 2, s.skin[0]);
    put(L + 2, ey + 2, s.skin[0]);
    put(R, ey + 2, s.skin[0]);
    put(R + 2, ey + 2, s.skin[0]);
  }
  // brows
  const by = ey - 3;
  if (e === 'angry') {
    put(L, by, d), put(L + 1, by + 1, d), put(L + 2, by + 1, d);
    put(R + 2, by, d), put(R + 1, by + 1, d), put(R, by + 1, d);
  } else if (e === 'sad' || e === 'scared') {
    put(L + 2, by, d), put(L + 1, by + 1, d), put(L, by + 1, d);
    put(R, by, d), put(R + 1, by + 1, d), put(R + 2, by + 1, d);
  } else {
    span(put, L, L + 2, by, s.hair[0]);
    span(put, R, R + 2, by, s.hair[0]);
  }
  // nose
  put(hx - 1, ey + 2, s.skin[0]);
  // mouth
  const my = ey + 4;
  if (open) {
    span(put, hx - 2, hx, my, d);
    span(put, hx - 2, hx, my + 1, '#9a3a48');
  } else if (e === 'happy') {
    put(hx - 3, my - 1, d);
    span(put, hx - 2, hx, my, d);
    put(hx + 1, my - 1, d);
  } else if (e === 'sad' || e === 'scared') {
    put(hx - 3, my + 1, d);
    span(put, hx - 2, hx, my, d);
    put(hx + 1, my + 1, d);
  } else if (e === 'angry') {
    span(put, hx - 3, hx + 1, my, d);
  } else span(put, hx - 2, hx, my, d);
  if (e === 'happy' || e === 'scared') {
    put(L - 1, ey + 3, '#e8968c');
    put(R + 3, ey + 3, '#e8968c');
  }
}

function hairFront(put: Put, s: PersonSpec, hx: number, hy: number, layer: 'back' | 'front'): void {
  const [sh, base, hi] = s.hair;
  if (layer === 'back') {
    if (s.hairStyle === 'long')
      for (const y of range(hy + 2, hy + 44)) {
        const w = y < hy + 10 ? 14 : 16 - Math.max(0, (y - hy - 38) * 2);
        span(put, hx - w / 2, hx + w / 2 - 1, y, y % 7 === 0 ? sh : base);
        put(hx + w / 2 - 1, y, sh);
      }
    if (s.hairStyle === 'low-tail')
      for (const y of range(hy + 4, hy + 18)) {
        span(put, hx - 6, hx + 5, y, base);
        put(hx + 5, y, sh);
      }
    return;
  }
  // crown, rounded, a little larger than the skull
  const crown = [6, 10, 12, 12];
  crown.forEach((w, i) => span(put, hx - w / 2, hx + w / 2 - 1, hy - 2 + i, i === 1 ? base : base));
  span(put, hx - 3, hx - 1, hy - 1, hi);
  put(hx + 4, hy, sh);
  if (s.hairStyle === 'messy') {
    // spiky top and heavy bangs down to the eyes, untidy sides
    for (const [x, y] of [
      [hx - 5, hy - 3],
      [hx - 1, hy - 4],
      [hx + 3, hy - 3],
      [hx + 5, hy - 2],
      [hx - 6, hy - 1],
    ] as const)
      put(x, y, base);
    for (const y of range(hy + 2, hy + 5)) span(put, hx - 6, hx + 5, y, base);
    // fringe strands hanging over the eyes
    for (const x of [hx - 5, hx - 3, hx, hx + 2, hx + 4]) {
      put(x, hy + 6, base);
      put(x, hy + 7, sh);
    }
    for (const y of range(hy + 4, hy + 11)) {
      put(hx - 6, y, base);
      put(hx + 5, y, sh);
    }
    span(put, hx - 4, hx - 2, hy + 3, hi);
  } else if (s.hairStyle === 'long') {
    for (const y of range(hy + 2, hy + 4)) span(put, hx - 6, hx + 5, y, base);
    for (const x of [hx - 5, hx - 2, hx + 1, hx + 4]) put(x, hy + 5, base);
    for (const y of range(hy + 3, hy + 22)) {
      span(put, hx - 7, hx - 6, y, y % 5 === 0 ? sh : base);
      span(put, hx + 5, hx + 6, y, sh);
    }
    span(put, hx - 3, hx, hy + 1, hi);
  } else {
    // side-swept bangs, hair tucked behind the ears
    for (const y of range(hy + 2, hy + 4)) span(put, hx - 6, hx + 5 - (y - hy - 2) * 2, y, base);
    for (const y of range(hy + 3, hy + 12)) {
      put(hx - 6, y, base);
      put(hx + 5, y, sh);
    }
    span(put, hx - 4, hx - 1, hy, hi);
  }
  if (s.ribbons) {
    // one bow on top of the head: the left loop blue, the right loop green, a knot between
    const [a, b] = s.ribbons;
    span(put, hx - 6, hx - 2, hy - 4, a);
    span(put, hx - 7, hx - 1, hy - 3, a);
    span(put, hx - 6, hx - 2, hy - 2, a);
    span(put, hx + 1, hx + 5, hy - 4, b);
    span(put, hx, hx + 6, hy - 3, b);
    span(put, hx + 1, hx + 5, hy - 2, b);
    span(put, hx - 1, hx, hy - 3, s.line);
    put(hx - 5, hy - 3, '#ffffff');
    put(hx + 2, hy - 3, '#ffffff');
  }
  if (s.hairclip) {
    put(hx + 3, hy + 2, '#e8303a');
    put(hx + 2, hy + 3, '#e8303a');
    put(hx + 4, hy + 3, '#e8303a');
    put(hx + 4, hy + 4, '#f0c830');
  }
}

/** Torso + arms (front). y0 = shoulder line. */
function bodyFront(put: Put, s: PersonSpec, cx: number, y0: number): void {
  const t = s.topTones;
  const slump = s.slouch ? 1 : 0;
  // shoulders → waist → hips: hoodies hang straight and wide
  const narrow = s.bottom === 'skirt' ? 2 : 0; // a slighter frame
  const width = (i: number) => {
    if (s.top === 'hoodie') return i < 2 ? 16 + i * 2 : 19;
    if (i < 2) return 15 + i * 2 - narrow;
    if (i < 14) return 17 - narrow - Math.min(3, Math.floor((i - 2) / 4));
    return 15 - narrow + Math.min(3, i - 14);
  };
  const rows: [number, number, number][] = [];
  const H = 26;
  for (let i = 0; i < H; i++) {
    const w = width(i);
    rows.push([y0 + i, cx - Math.floor(w / 2) + (i === 0 ? slump : 0), cx + Math.ceil(w / 2) - 1 - (i === 0 ? slump : 0)]);
  }
  shadedRows(put, rows, t, 2, 3);
  if (s.top === 'hoodie') {
    // hood bunched behind the neck, drawstrings, kangaroo pocket, ribbed hem
    span(put, cx - 5, cx + 4, y0 - 1, t[0]);
    span(put, cx - 3, cx + 2, y0, t[0]);
    for (const x of [cx - 2, cx + 1]) for (const y of range(y0 + 1, y0 + 7)) put(x, y, s.accent);
    for (const y of range(y0 + 15, y0 + 21)) span(put, cx - 6 + Math.max(0, y0 + 16 - y), cx + 5 - Math.max(0, y0 + 16 - y), y, t[0]);
    span(put, cx - 5, cx + 4, y0 + 16, t[1]);
    span(put, cx - 9, cx + 9, y0 + H - 1, t[0]);
  } else {
    // open front: shirt and tie / blouse between the lapels
    for (let i = 0; i < 16; i++) {
      const half = i < 6 ? 2 + Math.floor(i / 2) : 3 - Math.floor((i - 6) / 6);
      span(put, cx - half, cx + half - 1, y0 + i, s.inner[i < 1 ? 0 : 1]);
      put(cx - half - 1, y0 + i, t[0]);
      put(cx + half, y0 + i, t[2]);
    }
    if (s.top === 'blazer') {
      // red ribbon tie + buttons
      span(put, cx - 2, cx + 1, y0 + 2, s.accent);
      span(put, cx - 3, cx + 2, y0 + 3, s.accent);
      put(cx - 1, y0 + 4, s.accent), put(cx, y0 + 4, s.accent);
      put(cx - 2, y0 + 5, s.accent), put(cx + 1, y0 + 5, s.accent);
      for (const y of [y0 + 17, y0 + 21]) put(cx - 1, y, '#d8c070');
      span(put, cx - 7, cx + 6, y0 + 15, t[0]);
    } else {
      // cardigan: buttons down the edge, pockets
      for (const y of [y0 + 8, y0 + 12, y0 + 16, y0 + 20]) put(cx + 3, y, t[0]);
      span(put, cx - 7, cx - 4, y0 + 18, t[0]);
      span(put, cx + 4, cx + 7, y0 + 18, t[0]);
    }
  }
  // arms hanging at the sides, hands at hip level
  const armY0 = y0 + 1;
  for (let i = 0; i < 23; i++) {
    const y = armY0 + i;
    const out = s.top === 'hoodie' ? 1 : 0;
    const lx = cx - Math.floor(width(Math.min(i, H - 1)) / 2) - 3 - out + (i > 18 ? 1 : 0);
    const rx = cx + Math.ceil(width(Math.min(i, H - 1)) / 2) + out - (i > 18 ? 1 : 0);
    span(put, lx, lx + 2, y, i < 2 ? t[1] : t[2]);
    put(lx + 2, y, t[1]);
    span(put, rx, rx + 2, y, t[1]);
    put(rx + 2, y, t[0]);
  }
  // hands (hoodie sleeves cover half the hand)
  const hy = armY0 + 23;
  const lx = cx - Math.floor(width(H - 1) / 2) - 2 - (s.top === 'hoodie' ? 1 : 0);
  const rx = cx + Math.ceil(width(H - 1) / 2) - 1 + (s.top === 'hoodie' ? 1 : 0);
  for (const [x, c] of [
    [lx, s.skin[1]],
    [rx, s.skin[0]],
  ] as const) {
    span(put, x, x + 2, hy, c);
    span(put, x, x + 2, hy + 1, c);
    put(x + 1, hy + 2, c);
  }
}

function legsFront(put: Put, s: PersonSpec, cx: number, y0: number, H: number): void {
  const b = s.bottomTones;
  if (s.bottom === 'pants') {
    for (let i = 0; i < H - 4; i++) {
      const y = y0 + i;
      // two legs, a seam gap below the crotch
      if (i < 5) shadedRows(put, [[y, cx - 7, cx + 6]], b, 1, 2);
      else {
        shadedRows(put, [[y, cx - 7 + (i > H - 12 ? 1 : 0), cx - 1]], b, 1, 1);
        shadedRows(put, [[y, cx, cx + 6 - (i > H - 12 ? 1 : 0)]], b, 1, 2);
      }
    }
    // a crease at the knees
    put(cx - 4, y0 + Math.round(H * 0.5), b[0]);
    put(cx + 3, y0 + Math.round(H * 0.5), b[0]);
  } else {
    const skirtH = 13;
    for (let i = 0; i < skirtH; i++) {
      const half = 7 + Math.floor(i / 3);
      shadedRows(put, [[y0 + i, cx - half, cx + half - 1]], b, 2, 3);
      if (i > 2) for (let x = cx - half + 2; x < cx + half - 1; x += 3) put(x, y0 + i, b[0]); // pleats
    }
    for (let i = skirtH; i < H - 4; i++) {
      const y = y0 + i;
      const sock = s.socks && i > H - 15;
      span(put, cx - 5, cx - 2, y, sock ? s.socks! : s.legs[1]);
      put(cx - 2, y, sock ? '#c8c4c0' : s.legs[0]);
      span(put, cx + 1, cx + 4, y, sock ? s.socks! : s.legs[1]);
      put(cx + 4, y, sock ? '#c8c4c0' : s.legs[0]);
    }
  }
  // shoes
  const sy = y0 + H - 4;
  const sh = s.shoes;
  for (let i = 0; i < 4; i++) {
    span(put, cx - 7 + (i < 1 ? 1 : 0), cx - 1, sy + i, i === 3 ? sh[0] : sh[1]);
    span(put, cx, cx + 6 - (i < 1 ? 1 : 0), sy + i, i === 3 ? sh[0] : sh[1]);
  }
  put(cx - 6, sy + 1, sh[2]);
  put(cx + 1, sy + 1, sh[2]);
}

// ---------------------------------------------------------------- side view (facing right)

function drawSide(put: Put, s: PersonSpec, f: Frame, bob: number): void {
  const cx = 15;
  const slouch = s.slouch ? 2 : 0;
  const hy = 5 + bob + (s.slouch ? 1 : 0);
  const hx = cx + slouch;
  const [hsh, hbase, hhi] = s.hair;
  // back hair
  if (s.hairStyle === 'long') for (const y of range(hy + 2, hy + 42)) span(put, hx - 7, hx - 2, y, y % 6 ? hbase : hsh);
  if (s.hairStyle === 'low-tail') for (const y of range(hy + 8, hy + 20)) span(put, hx - 7, hx - 4, y, hbase);
  // head profile: back of skull left, nose to the right
  const w = [6, 8, 9, 10, 10, 10, 10, 10, 9, 8, 6, 4];
  w.forEach((wi, i) => {
    const x0 = hx - 5;
    span(put, x0, x0 + wi - 1, hy + i, s.skin[1]);
    put(x0, hy + i, s.skin[0]);
  });
  put(hx + 5, hy + 7, s.skin[1]); // nose
  put(hx + 2, hy + 6, s.line);
  put(hx + 3, hy + 6, f.emotion === 'scared' ? '#ffffff' : s.eyes);
  put(hx + 2, hy + 5, s.line);
  put(hx + 3, hy + 10, s.line);
  if (f.mouthOpen) put(hx + 3, hy + 11, '#9a3a48');
  put(hx - 2, hy + 6, s.skin[0]); // ear
  for (const y of [hy + 12, hy + 13]) span(put, hx - 2, hx + 1, y, s.skin[0]);
  // hair on top
  [8, 11, 12, 12].forEach((wi, i) => span(put, hx - 6, hx - 6 + wi - 1, hy - 2 + i, hbase));
  span(put, hx - 4, hx, hy - 1, hhi);
  if (s.hairStyle === 'messy') {
    for (const [x, y] of [
      [hx - 4, hy - 3],
      [hx, hy - 4],
      [hx + 4, hy - 2],
    ] as const)
      put(x, y, hbase);
    for (const y of range(hy + 2, hy + 6)) span(put, hx + 2, hx + 5, y, hbase);
    for (const y of range(hy + 2, hy + 11)) span(put, hx - 6, hx - 3, y, y > hy + 8 ? hsh : hbase);
  } else {
    for (const y of range(hy + 2, hy + 4)) span(put, hx + 1, hx + 5, y, hbase);
    for (const y of range(hy + 2, hy + 12)) span(put, hx - 6, hx - 3, y, hbase);
  }
  if (s.ribbons) {
    // the same single bow seen from the side: blue loop behind, green loop in front
    span(put, hx - 6, hx - 3, hy - 4, s.ribbons[0]);
    span(put, hx - 7, hx - 3, hy - 3, s.ribbons[0]);
    span(put, hx - 2, hx + 1, hy - 4, s.ribbons[1]);
    span(put, hx - 2, hx + 2, hy - 3, s.ribbons[1]);
  }
  // walk: legs and arms swing in opposite phase; 0 and 2 are contact poses
  const phase = f.walk < 0 ? -1 : f.walk;
  const swing = phase < 0 ? 0 : [4, 0, -4, 0][phase]!;
  const lift = phase === 1 || phase === 3 ? 2 : 0;
  const y0 = 19 + bob + (s.slouch ? 1 : 0);
  const t = s.topTones;
  // far arm (behind the torso)
  limb(put, cx + 1 + slouch, y0 + 1, -swing * 0.8, 22, 3, t[0], s.skin[0]);
  // torso
  const torso: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) {
    const back = s.top === 'hoodie' ? 6 : 5;
    const front = s.top === 'hoodie' ? 5 : i < 8 ? 5 : 4;
    const lean = s.slouch ? Math.max(0, 3 - Math.floor(i / 4)) : 0;
    torso.push([y0 + i, cx - back + lean, cx + front + lean]);
  }
  shadedRows(put, torso, t, 1, 2);
  if (s.top !== 'hoodie') for (const y of range(y0, y0 + 10)) put(cx + 4 + (s.slouch ? 1 : 0), y, s.inner[1]);
  if (s.top === 'hoodie') span(put, cx - 6 + 2, cx - 6 + 5, y0 - 1, t[0]);
  // legs
  const ly = y0 + 26;
  const LH = 80 - 4 - ly;
  const b = s.bottomTones;
  if (s.bottom === 'skirt') for (let i = 0; i < 12; i++) shadedRows(put, [[ly + i, cx - 6 - Math.floor(i / 4), cx + 5 + Math.floor(i / 4)]], b, 1, 2);
  legSide(put, cx, s.bottom === 'skirt' ? ly + 10 : ly, s.bottom === 'skirt' ? LH - 10 : LH, -swing, phase === 3 ? lift : 0, s, true);
  legSide(put, cx, s.bottom === 'skirt' ? ly + 10 : ly, s.bottom === 'skirt' ? LH - 10 : LH, swing, phase === 1 ? lift : 0, s, false);
  // near arm (in front of the torso)
  limb(put, cx + slouch, y0 + 1, swing * 0.8, 22, 3, t[1], s.skin[1]);
}

/** An arm: a column of width w that leans dx pixels by its end; a hand at the end. */
function limb(put: Put, x: number, y: number, dx: number, len: number, w: number, c: string, hand: string): void {
  for (let i = 0; i < len; i++) {
    const xx = Math.round(x + (dx * i) / len);
    span(put, xx - 1, xx - 1 + w - 1, y + i, c);
    put(xx - 2, y + i, '#00000055'); // the arm's back edge, so it reads against the torso
  }
  const hx = Math.round(x + dx);
  span(put, hx - 1, hx + 1, y + len, hand);
  span(put, hx - 1, hx + 1, y + len + 1, hand);
}

function legSide(put: Put, cx: number, y: number, len: number, dx: number, lift: number, s: PersonSpec, far: boolean): void {
  const b = s.bottom === 'pants' ? s.bottomTones : s.legs;
  const c = far ? b[0] : b[1];
  for (let i = 0; i < len - lift; i++) {
    const k = i / len;
    const xx = Math.round(cx - 2 + dx * k * k + (lift && i > len * 0.6 ? -1 : 0));
    span(put, xx, xx + 4, y + i, c);
    if (!far) put(xx + 4, y + i, b[0]);
  }
  const fy = y + len - lift;
  const fx = Math.round(cx - 2 + dx);
  const sh = s.shoes;
  span(put, fx, fx + 6, fy, far ? sh[0] : sh[1]);
  span(put, fx, fx + 6, fy + 1, far ? sh[0] : sh[1]);
  span(put, fx, fx + 6, fy + 2, sh[0]);
}

/** Seen from behind: the back of the head, no face; hood, back seams, heels of the shoes. */
function drawBack(put: Put, s: PersonSpec, cx: number, hy: number, y0: number): void {
  legsFront(put, { ...s, shoes: [s.shoes[0], s.shoes[0], s.shoes[1]] }, cx, y0 + 26, 80 - y0 - 26);
  bodyFront(put, { ...s, top: s.top === 'hoodie' ? 'hoodie' : 'cardigan', inner: s.topTones }, cx, y0);
  if (s.top === 'hoodie') {
    // the hood lies over the shoulders; drawstrings and pocket are on the other side
    for (let i = 0; i < 6; i++) span(put, cx - 6 + Math.floor(i / 2), cx + 5 - Math.floor(i / 2), y0 + i, i < 2 ? s.topTones[0] : s.topTones[1]);
    for (let y = y0 + 1; y < y0 + 22; y++) put(cx, y, s.topTones[0]);
  } else for (let y = y0 + 2; y < y0 + 24; y++) put(cx, y, s.topTones[0]);
  headFront(put, s, cx, hy);
  // the whole head is hair
  const [sh, base, hi] = s.hair;
  [6, 10, 12, 12, 12, 12, 12, 12, 12, 11, 10, 8, 6].forEach((w, i) => span(put, cx - w / 2, cx + w / 2 - 1, hy - 2 + i, i > 9 ? sh : base));
  span(put, cx - 3, cx, hy - 1, hi);
  if (s.hairStyle === 'long')
    for (let y = hy + 10; y < hy + 44; y++) {
      const w = 16 - Math.max(0, (y - hy - 38) * 2);
      span(put, cx - w / 2, cx + w / 2 - 1, y, y % 7 === 0 ? sh : base);
    }
  if (s.hairStyle === 'low-tail') for (let y = hy + 10; y < hy + 22; y++) span(put, cx - 2, cx + 1, y, y > hy + 18 ? sh : base);
  if (s.hairStyle === 'messy') for (const x of [cx - 5, cx - 2, cx + 1, cx + 4]) put(x, hy + 11, base);
  if (s.ribbons) {
    // from behind the loops swap sides: green on the left, blue on the right
    span(put, cx - 6, cx - 1, hy - 3, s.ribbons[1]);
    span(put, cx - 7, cx - 1, hy - 2, s.ribbons[1]);
    span(put, cx, cx + 5, hy - 3, s.ribbons[0]);
    span(put, cx, cx + 6, hy - 2, s.ribbons[0]);
  }
}

export function drawPerson(put: Put, s: PersonSpec, f: Frame): void {
  const bob = f.breath;
  if (f.facing === 'side' && f.pose === 'crouch') {
    // ducking under a line of code: the upper body drops, knees bent forward
    const HIP = 45;
    const DROP = 26;
    drawSide((x, y, c) => y < HIP && put(x, y + DROP, c), s, { ...f, walk: -1, pose: undefined }, 0);
    const b = s.bottom === 'pants' ? s.bottomTones : s.legs;
    for (let y = HIP + DROP - 2; y < HIP + DROP + 2; y++) span(put, 12, 21, y, b[1]);
    for (let y = HIP + DROP + 2; y < 77; y++) span(put, 17, 21, y, b[0]);
    span(put, 13, 15, 77, b[1]);
    for (const y of [77, 78, 79]) span(put, 17, 23, y, y === 79 ? s.shoes[0] : s.shoes[1]);
    return;
  }
  if (f.facing === 'side') {
    // a walking body bobs on the passing frames
    drawSide(put, s, f, f.walk === 1 || f.walk === 3 ? -1 : 0);
    return;
  }
  const cx = 16;
  const slouch = s.slouch ? 1 : 0;
  const hx = cx;
  const hy = 5 + bob + slouch;
  if (f.facing === 'back') {
    drawBack(put, s, cx, hy, 19 + bob + slouch);
    return;
  }
  hairFront(put, s, hx, hy, 'back');
  const y0 = 19 + bob + slouch;
  legsFront(put, s, cx, y0 + 26, 80 - y0 - 26);
  bodyFront(put, s, cx, y0);
  headFront(put, s, hx, hy);
  faceFront(put, s, hx, hy, f.emotion, f.mouthOpen);
  hairFront(put, s, hx, hy, 'front');
}

export const PEOPLE: Record<string, PersonSpec> = {
  // Working designs (not approved by the author): see docs/ART_BRIEF.md.
  dameo: {
    skin: ['#c49a86', '#e2bca6', '#f0d0bc'],
    hair: ['#141218', '#1f1c26', '#34303e'],
    eyes: '#3a3040',
    line: '#1a1418',
    hairStyle: 'messy',
    slouch: true,
    top: 'hoodie',
    topTones: ['#2a3230', '#3c4644', '#566260'],
    inner: ['#2a3230', '#3c4644', '#566260'],
    accent: '#c8ccc4',
    bottom: 'pants',
    bottomTones: ['#16161c', '#23232b', '#33333e'],
    legs: ['#16161c', '#23232b', '#33333e'],
    shoes: ['#6a6a70', '#c8c8cc', '#ececf0'],
    eyeBags: true,
  },
  satsuki: {
    skin: ['#cfa48c', '#ecc8b0', '#f8dccc'],
    hair: ['#3a2418', '#5a3a26', '#7a5236'],
    eyes: '#4a3020',
    line: '#2a1a14',
    hairStyle: 'low-tail',
    slouch: false,
    top: 'cardigan',
    topTones: ['#4e543a', '#686d4e', '#848a66'],
    inner: ['#c8c4bc', '#f0ece4', '#ffffff'],
    accent: '#a83a3a',
    bottom: 'skirt',
    bottomTones: ['#2a2a34', '#3a3a48', '#4a4a5a'],
    legs: ['#2a2a30', '#34343c', '#44444c'],
    shoes: ['#3a2418', '#5a3a26', '#7a5236'],
  },
  melody: {
    skin: ['#e0a898', '#f8d4c4', '#ffe8dc'],
    hair: ['#d8608a', '#f08ab0', '#ffc0d8'],
    eyes: '#c83a7a',
    line: '#3a1a2a',
    hairStyle: 'long',
    slouch: false,
    top: 'blazer',
    topTones: ['#1e2450', '#2c3470', '#3e4890'],
    inner: ['#d8d4dc', '#f4f0f8', '#ffffff'],
    accent: '#e8304a',
    bottom: 'skirt',
    bottomTones: ['#1e2450', '#2c3470', '#3e4890'],
    legs: ['#e0a898', '#f8d4c4', '#ffe8dc'],
    socks: '#f4f0f8',
    shoes: ['#141418', '#24242c', '#3a3a44'],
    ribbons: ['#3a5ad8', '#3ad86a'],
    hairclip: true,
  },
};

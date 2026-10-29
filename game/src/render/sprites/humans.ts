// Modular pixel humans on a fixed 24×48 grid. Every character is assembled
// from compatible parts (head, face/emotion, hair, outfit, accessories) with
// fixed attachment points and one palette per character, so the same id
// always produces exactly the same sprite.

export const HUMAN_W = 24;
export const HUMAN_H = 48;

export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'scared' | 'tired';
export type Facing = 'front' | 'side' | 'back';

export interface HumanSpec {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  hairHi: string;
  eyes: string;
  hairStyle: 'messy' | 'long' | 'low-tail';
  top: 'hoodie' | 'blazer' | 'cardigan';
  topColor: string;
  topShade: string;
  inner: string; // shirt under blazer/cardigan
  accent: string; // tie / hoodie strings
  bottom: 'pants' | 'skirt';
  bottomColor: string;
  bottomShade: string;
  shoes: string;
  outline: string;
  ribbons?: [string, string];
  hairclip?: boolean;
}

export interface Frame {
  facing: Facing;
  emotion: Emotion;
  /** 0..3 walk phase (side only), -1 = standing. */
  walk: number;
  breath: 0 | 1;
  mouthOpen: boolean;
  /** Special body poses for the chase (side view only). */
  pose?: 'crouch';
}

type Put = (x: number, y: number, c: string) => void;

function rows(put: Put, x0: number, y0: number, widths: number[], c: string, center = 12): void {
  widths.forEach((w, i) => {
    const xs = Math.round(center - w / 2) + x0;
    for (let x = 0; x < w; x++) put(xs + x, y0 + i, c);
  });
}

/** Head 12×12 centred at x=12, top at y (front view). */
function headFront(put: Put, s: HumanSpec, y: number): void {
  const widths = [6, 8, 10, 10, 10, 10, 10, 10, 10, 8, 6, 4];
  rows(put, 0, y, widths.map((w) => w + 2), s.outline);
  rows(put, 0, y + 1, widths.slice(0, -1).map((w) => w), s.skin);
  // Jaw shading on the right side.
  for (let i = 6; i < 10; i++) put(16, y + i, s.skinShade);
}

function faceFront(put: Put, s: HumanSpec, y: number, e: Emotion, mouthOpen: boolean): void {
  const ey = y + 6;
  const eyeL = 9;
  const eyeR = 14;
  const dark = s.outline;
  const eye = (x: number) => {
    if (e === 'happy') {
      put(x, ey, dark);
      put(x + 1, ey - 1, dark);
      put(x + 2, ey, dark);
      return;
    }
    if (e === 'tired') {
      put(x, ey, dark);
      put(x + 1, ey, dark);
      put(x + 1, ey + 1, s.eyes);
      return;
    }
    const tall = e === 'scared' ? 3 : 2;
    for (let k = 0; k < tall; k++) {
      put(x, ey + k - (e === 'scared' ? 1 : 0), dark);
      put(x + 1, ey + k - (e === 'scared' ? 1 : 0), k === 0 ? '#ffffff' : s.eyes);
    }
  };
  eye(eyeL);
  eye(eyeR);
  // Brows.
  if (e === 'angry') {
    put(eyeL, ey - 2, dark);
    put(eyeL + 1, ey - 1, dark);
    put(eyeR + 1, ey - 2, dark);
    put(eyeR, ey - 1, dark);
  } else if (e === 'sad' || e === 'scared') {
    put(eyeL + 1, ey - 2, dark);
    put(eyeL, ey - 1, dark);
    put(eyeR, ey - 2, dark);
    put(eyeR + 1, ey - 1, dark);
  }
  // Blush and mouth.
  if (e !== 'angry' && e !== 'tired') {
    put(8, ey + 3, '#e69a9a');
    put(16, ey + 3, '#e69a9a');
  }
  const my = ey + 4;
  if (mouthOpen) {
    put(11, my, dark);
    put(12, my, dark);
    put(11, my + 1, '#b4505a');
    put(12, my + 1, dark);
  } else if (e === 'happy') {
    put(11, my, dark);
    put(12, my + 0, dark);
    put(10, my - 1, dark);
    put(13, my - 1, dark);
  } else if (e === 'sad' || e === 'scared') {
    put(11, my, dark);
    put(12, my, dark);
    put(10, my + 1, dark);
    put(13, my + 1, dark);
  } else put(11, my, dark), put(12, my, dark);
}

function hairFront(put: Put, s: HumanSpec, y: number, back: boolean): void {
  const H = s.hair;
  const D = s.hairShade;
  const L = s.hairHi;
  if (s.hairStyle === 'long') {
    if (back) {
      // Long hair falls behind the body to the waist.
      for (let yy = y + 4; yy < y + 30; yy++) {
        const w = 16 + (yy > y + 20 ? 2 : 0);
        for (let x = 12 - w / 2; x < 12 + w / 2; x++) put(x, yy, (x + yy) % 5 === 0 ? D : H);
      }
      return;
    }
    rows(put, 0, y - 1, [8, 12, 14, 14, 14], H);
    // Fringe with gaps.
    for (let x = 6; x < 18; x++) {
      const len = 2 + ((x * 7) % 3);
      for (let k = 0; k < len; k++) put(x, y + 4 + k, k === len - 1 ? D : H);
    }
    for (let yy = y + 4; yy < y + 16; yy++) {
      put(5, yy, H);
      put(6, yy, D);
      put(18, yy, H);
      put(17, yy, D);
    }
    put(9, y + 1, L);
    put(10, y + 1, L);
    put(14, y + 1, L);
    return;
  }
  if (s.hairStyle === 'low-tail') {
    if (back) {
      for (let yy = y + 10; yy < y + 22; yy++) put(18 + ((yy >> 2) & 1), yy, H);
      return;
    }
    rows(put, 0, y - 1, [8, 12, 14, 14], H);
    for (let x = 6; x < 18; x++) for (let k = 0; k < (x < 12 ? 3 : 2); k++) put(x, y + 3 + k, H);
    for (let yy = y + 3; yy < y + 11; yy++) {
      put(5, yy, H);
      put(18, yy, D);
    }
    put(10, y, L);
    put(11, y, L);
    return;
  }
  // messy (Dameo): spiky silhouette, uneven fringe that hides the brows.
  if (back) return;
  rows(put, 0, y - 1, [6, 12, 14, 14], H);
  [7, 10, 13, 16].forEach((x) => put(x, y - 2, H));
  for (let x = 6; x < 18; x++) {
    const len = 2 + ((x * 5 + 1) % 4 === 0 ? 2 : (x * 3) % 2);
    for (let k = 0; k < len; k++) put(x, y + 3 + k, k === len - 1 ? D : H);
  }
  for (let yy = y + 3; yy < y + 9; yy++) {
    put(5, yy, H);
    put(18, yy, D);
  }
  put(9, y, L);
  put(12, y - 1, L);
}

function accessoriesFront(put: Put, s: HumanSpec, y: number): void {
  if (s.ribbons) {
    const [a, b] = s.ribbons;
    // Blue bow on the left, green on the right (from Melody's art).
    [[3, 0], [4, 1], [3, 2], [5, 1], [6, 0], [6, 2]].forEach(([x, k]) => put(x!, y - 1 + k!, a));
    [[17, 1], [18, 0], [18, 2], [19, 1], [20, 0], [20, 2]].forEach(([x, k]) => put(x!, y - 1 + k!, b));
  }
  if (s.hairclip) {
    put(15, y + 2, '#e03030');
    put(14, y + 3, '#e03030');
    put(16, y + 3, '#e03030');
    put(16, y + 4, '#f0d040');
  }
}

function bodyFront(put: Put, s: HumanSpec, breath: 0 | 1): void {
  const y = 17 + breath;
  const C = s.topColor;
  const D = s.topShade;
  const O = s.outline;
  // Neck.
  put(11, 16, s.skinShade);
  put(12, 16, s.skinShade);
  // Torso + arms.
  for (let yy = y; yy < 31; yy++) {
    const half = yy < y + 2 ? 6 : 5;
    for (let x = 12 - half; x < 12 + half; x++) put(x, yy, x >= 12 + half - 2 ? D : C);
    put(12 - half - 1, yy, O);
    put(12 + half, yy, O);
  }
  for (let yy = y + 1; yy < 29; yy++) {
    put(4, yy, C);
    put(5, yy, D);
    put(18, yy, D);
    put(19, yy, C);
  }
  put(4, 29, s.skin);
  put(5, 29, s.skin);
  put(18, 29, s.skin);
  put(19, 29, s.skin);
  if (s.top === 'hoodie') {
    for (let x = 8; x < 16; x++) put(x, y, D);
    put(10, y + 1, s.accent);
    put(10, y + 3, s.accent);
    put(13, y + 1, s.accent);
    put(13, y + 3, s.accent);
    for (let x = 8; x < 16; x++) put(x, 25, D); // pocket
  } else {
    // Open front: shirt and (for blazer) a tie.
    for (let yy = y; yy < 31; yy++) {
      const w = yy < y + 6 ? 1 + (yy - y) / 2 : 3;
      for (let x = Math.round(12 - w); x < Math.round(12 + w); x++) put(x, yy, s.inner);
    }
    if (s.top === 'blazer') for (let yy = y + 1; yy < y + 9; yy++) put(11 + ((yy - y) % 2 === 0 ? 0 : 1), yy, s.accent), put(12, yy, s.accent);
  }
}

function legsFront(put: Put, s: HumanSpec): void {
  if (s.bottom === 'skirt') {
    for (let yy = 30; yy < 37; yy++) {
      const half = 6 + Math.floor((yy - 30) / 3);
      for (let x = 12 - half; x < 12 + half; x++) put(x, yy, (x - yy) % 3 === 0 ? s.bottomShade : s.bottomColor);
    }
    for (let yy = 37; yy < 45; yy++) {
      put(9, yy, s.skin);
      put(10, yy, s.skin);
      put(13, yy, s.skin);
      put(14, yy, s.skin);
    }
    for (let yy = 41; yy < 45; yy++) for (const x of [9, 10, 13, 14]) put(x, yy, '#f2f0ec'); // socks
  } else {
    for (let yy = 31; yy < 45; yy++) {
      for (let x = 8; x < 12; x++) put(x, yy, x === 11 ? s.bottomShade : s.bottomColor);
      for (let x = 12; x < 16; x++) put(x, yy, x === 12 ? s.bottomShade : s.bottomColor);
    }
  }
  for (let x = 7; x < 12; x++) put(x, 45, s.shoes), put(x, 46, s.outline);
  for (let x = 12; x < 17; x++) put(x, 45, s.shoes), put(x, 46, s.outline);
}

/** Side view (facing right) used for walking. */
function drawSide(put: Put, s: HumanSpec, f: Frame): void {
  const bob = f.walk === 1 || f.walk === 3 ? 1 : 0;
  const y = 4 + bob;
  // Back hair for long styles.
  if (s.hairStyle === 'long') for (let yy = y + 4; yy < y + 28; yy++) for (let x = 6; x < 12; x++) put(x, yy, (x + yy) % 4 === 0 ? s.hairShade : s.hair);
  if (s.hairStyle === 'low-tail') for (let yy = y + 9; yy < y + 20; yy++) put(7, yy, s.hair);
  // Head profile.
  rows(put, 1, y, [6, 8, 10, 10, 10, 10, 10, 10, 9, 7, 5, 3], s.skin);
  put(18, y + 7, s.skin); // nose
  put(15, y + 6, s.outline);
  put(15, y + 7, f.emotion === 'happy' ? s.outline : s.eyes);
  if (f.mouthOpen) put(16, y + 10, '#b4505a');
  else put(16, y + 10, s.outline);
  // Hair cap.
  rows(put, 0, y - 1, [6, 11, 13, 12, 10], s.hair);
  for (let yy = y + 3; yy < y + 9; yy++) put(8, yy, s.hair), put(9, yy, s.hairShade);
  if (s.ribbons) {
    put(9, y - 2, s.ribbons[0]);
    put(10, y - 3, s.ribbons[0]);
    put(15, y - 2, s.ribbons[1]);
  }
  // Torso.
  const ty = 17 + bob;
  for (let yy = ty; yy < 31 + bob; yy++) for (let x = 9; x < 16; x++) put(x, yy, x > 13 ? s.topShade : s.topColor);
  if (s.top !== 'hoodie') for (let yy = ty; yy < ty + 6; yy++) put(15, yy, s.inner);
  // Arm swings opposite to the front leg.
  const swing = [0, 2, 0, -2][Math.max(0, f.walk)]! * (f.walk < 0 ? 0 : 1);
  for (let k = 0; k < 10; k++) put(12 + Math.round((swing * k) / 10), ty + 1 + k, s.topShade);
  put(12 + swing, ty + 11, s.skin);
  // Legs.
  const stride = f.walk < 0 ? [0, 0] : ([[3, -3], [1, -1], [-3, 3], [-1, 1]] as const)[f.walk]!;
  const legTop = 31 + bob;
  const leg = (dx: number, c: string) => {
    for (let k = 0; k < 14 - bob; k++) {
      const x = 11 + Math.round((dx * k) / 13);
      put(x, legTop + k, c);
      put(x + 1, legTop + k, c);
      put(x + 2, legTop + k, c);
    }
    const fx = 11 + dx;
    for (let x = fx; x < fx + 5; x++) put(x, 45, s.shoes), put(x, 46, s.outline);
  };
  if (s.bottom === 'skirt') {
    for (let yy = 30 + bob; yy < 37 + bob; yy++) for (let x = 8; x < 17; x++) put(x, yy, s.bottomColor);
    leg(stride[1], s.skinShade);
    leg(stride[0], s.skin);
  } else {
    leg(stride[1], s.bottomShade);
    leg(stride[0], s.bottomColor);
  }
}

/** Draws one frame through `put` (x, y on the 24×48 grid). */
export function drawHuman(put: Put, s: HumanSpec, f: Frame): void {
  if (f.facing === 'side') return drawSide(put, s, f);
  const y = 4 + f.breath * 0;
  hairFront(put, s, y, true);
  legsFront(put, s);
  bodyFront(put, s, f.breath);
  headFront(put, s, y);
  faceFront(put, s, y, f.emotion, f.mouthOpen);
  hairFront(put, s, y, false);
  accessoriesFront(put, s, y);
}

// ---- The cast -------------------------------------------------------------
// Melody's design follows her four sprites (pink hair, blue + green ribbons,
// red triangle / yellow circle hairclip, navy blazer, red tie). Dameo's and
// Satsuki's looks are not described in the sources: working designs, to be
// approved by the author (docs/GAME_DESIGN.md).

export const HUMANS: Record<string, HumanSpec> = {
  dameo: {
    skin: '#f0c9a8',
    skinShade: '#d6a585',
    hair: '#24222a',
    hairShade: '#16151a',
    hairHi: '#4a4756',
    eyes: '#3b4a5c',
    hairStyle: 'messy',
    top: 'hoodie',
    topColor: '#5b6b70',
    topShade: '#46545a',
    inner: '#e8e4da',
    accent: '#d8d4c8',
    bottom: 'pants',
    bottomColor: '#2f3540',
    bottomShade: '#252a33',
    shoes: '#e6e2d8',
    outline: '#1b1a20',
  },
  melody: {
    skin: '#f3c3a8',
    skinShade: '#e0a48a',
    hair: '#f08fa6',
    hairShade: '#d06c88',
    hairHi: '#ffd3e0',
    eyes: '#c0306e',
    hairStyle: 'long',
    top: 'blazer',
    topColor: '#3c3a78',
    topShade: '#2e2c5e',
    inner: '#f2eee8',
    accent: '#d8304a',
    bottom: 'skirt',
    bottomColor: '#34325e',
    bottomShade: '#28264a',
    shoes: '#3a2a2a',
    outline: '#2a1a26',
    ribbons: ['#4a4ae0', '#30e070'],
    hairclip: true,
  },
  satsuki: {
    skin: '#eec7a6',
    skinShade: '#d3a684',
    hair: '#4a3328',
    hairShade: '#36241c',
    hairHi: '#6e4f40',
    eyes: '#4a3328',
    hairStyle: 'low-tail',
    top: 'cardigan',
    topColor: '#7b7d62',
    topShade: '#64664f',
    inner: '#e9e4d8',
    accent: '#c9c2b0',
    bottom: 'skirt',
    bottomColor: '#4b4a4f',
    bottomShade: '#3b3a3f',
    shoes: '#3a3230',
    outline: '#22201e',
  },
};

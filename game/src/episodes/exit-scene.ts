// Per-frame drawing of «Выход»: parallax sky, spinning shapes, sparkles,
// wheel hubs, tracks of moving pieces, pieces, checkpoint flags, falling
// shards, the erasure from below, the monitor glass and Dameo himself
// (the side-view pixel sprite with walk frames).
import { spriteFrame } from '../render/sprites';
import { mix, rng, shade } from '../render/painter';
import { pieceArt, type Pal } from './exit-art';
import { buildSky } from './exit-sky';
import { BLINK_WARN, blinkOn, blinkWarning, CRUMBLE_TIME, pieceRect, VIEW_H, VIEW_W, type Course, type Piece } from './exit-course';
import type { RunState } from './exit-run';
import { bitmap, disc, HEART, poly, px, ring, shape, SPARKLE, SPARKLE_S, type Ctx } from './exit-pixels';

const PARALLAX = 0.6;

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
  born: number;
}

export interface Scene {
  draw(run: RunState, dt: number): void;
}

export function createScene(ctx: Ctx, course: Course, P: Pal, reduceMotion: boolean): Scene {
  const sky = buildSky(P, VIEW_W, Math.ceil(VIEW_H + (course.height - VIEW_H) * PARALLAX));
  const r = rng(77);
  const sparkles = Array.from({ length: 90 }, () => ({ x: r() * VIEW_W, y: 200 + r() * (course.height - 200), p: r() * 3, c: Math.floor(r() * 6) }));
  const spinners = Array.from({ length: 26 }, (_, i) => ({
    x: r() * VIEW_W,
    y: r() * (course.height * PARALLAX),
    s: 7 + r() * 9,
    sides: 3 + (i % 3),
    speed: (r() < 0.5 ? -1 : 1) * (0.4 + r()),
    c: i % 6,
  }));
  const shards: Shard[] = [];
  const wasGone = course.pieces.map(() => false);
  let camY = course.height - VIEW_H;
  let walkClock = 0;

  const toScreen = (y: number) => Math.round(y - camY);

  const drawHub = (cx: number, cy: number, radius: number, t: number, dir: number) => {
    ring(ctx, cx, toScreen(cy), radius, P.paper, true);
    const turn = dir * t * 0.9;
    for (let k = 0; k < 8; k++) {
      const a = turn + (k / 8) * Math.PI * 2;
      for (let s = 10; s < radius - 4; s += 3) px(ctx, cx + Math.cos(a) * s, toScreen(cy) + Math.sin(a) * s, 1, 1, P.rainbow[k % 6]!);
    }
    // a sun-flower hub with a face
    for (let k = 0; k < 10; k++) {
      const a = turn + (k / 10) * Math.PI * 2;
      disc(ctx, cx + Math.cos(a) * 9, toScreen(cy) + Math.sin(a) * 9, 4, k % 2 ? P.pink : P.orange);
    }
    disc(ctx, cx, toScreen(cy), 8, P.lemon);
    px(ctx, cx - 4, toScreen(cy) - 2, 2, 2, P.ink);
    px(ctx, cx + 2, toScreen(cy) - 2, 2, 2, P.ink);
    px(ctx, cx - 2, toScreen(cy) + 3, 4, 1, P.ink);
    px(ctx, cx - 7, toScreen(cy) + 1, 2, 1, P.pink);
    px(ctx, cx + 5, toScreen(cy) + 1, 2, 1, P.pink);
  };

  const drawTrack = (p: Piece) => {
    const m = p.motion;
    if (m.kind !== 'slide') return;
    const a = pieceRect(p, 0);
    const steps = Math.ceil(Math.hypot(m.dx, m.dy) / 6);
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      px(ctx, a.x + p.w / 2 + m.dx * k, toScreen(a.y + m.dy * k + 4), 2, 2, i % 2 ? P.paper : P.pink);
    }
  };

  const drawFlag = (p: Piece, lit: boolean, t: number) => {
    const rr = pieceRect(p, 0);
    const x = Math.round(rr.x + rr.w - 12);
    const y = toScreen(rr.y);
    px(ctx, x, y - 26, 2, 26, P.ink);
    px(ctx, x, y - 26, 1, 26, P.paper);
    const wave = lit && !reduceMotion ? Math.round(Math.sin(t * 6)) : 0;
    const col = lit ? P.pink : P.gray;
    poly(
      ctx,
      [
        [x + 2, y - 26],
        [x + 14, y - 22 + wave],
        [x + 2, y - 17],
      ],
      col,
    );
    bitmap(ctx, ['x.x', 'xxx', '.x.'], x + 4, y - 23, { x: lit ? P.paper : shade(P.gray, -0.2) });
    if (lit) bitmap(ctx, SPARKLE_S, x + 14, y - 30 + wave, { x: P.lemon, o: '#ffffff' });
  };

  const drawPiece = (p: Piece, i: number, run: RunState) => {
    const t = run.t;
    const rr = pieceRect(p, t);
    const gone = run.goneUntil[i]! > t;
    const y = toScreen(rr.y);
    if (y > VIEW_H + 4 || y + 120 < 0) return;
    if (p.motion.kind === 'blink') {
      const on = blinkOn(p, t);
      const soon = !on && blinkOn(p, t + BLINK_WARN);
      if (!on) {
        // a dashed ghost outline shows where the window will pop up
        const c = soon && Math.floor(t * 12) % 2 === 0 ? P.paper : shade(P.lavender, -0.25);
        const h = p.look === 'wall' ? p.h : 22;
        for (let x = 0; x < p.w; x += 4) {
          px(ctx, rr.x + x, y, 2, 1, c);
          px(ctx, rr.x + x, y + h - 1, 2, 1, c);
        }
        for (let yy = 0; yy < h; yy += 4) {
          px(ctx, rr.x, y + yy, 1, 2, c);
          px(ctx, rr.x + p.w - 1, y + yy, 1, 2, c);
        }
        return;
      }
      if (blinkWarning(p, t) && !reduceMotion && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.45;
    }
    if (p.crumble && gone) {
      const left = run.goneUntil[i]! - t;
      if (left < 0.6) {
        ctx.globalAlpha = 0.35;
        const ghost = pieceArt(p, P, 0);
        ctx.drawImage(ghost.img, Math.round(rr.x) + ghost.ox, y + ghost.oy);
        ctx.globalAlpha = 1;
      } else {
        for (let x = 0; x < p.w; x += 4) px(ctx, rr.x + x, y, 2, 1, shade(P.lavender, -0.25));
      }
      return;
    }
    const crack = p.crumble ? run.stood[i]! / CRUMBLE_TIME : 0;
    const art = pieceArt(p, P, crack);
    const shake = p.crumble && crack > 0.4 && !reduceMotion ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
    ctx.drawImage(art.img, Math.round(rr.x) + art.ox + shake, y + art.oy);
    ctx.globalAlpha = 1;
  };

  const drawErasure = (top: number, t: number) => {
    const y0 = toScreen(top);
    if (y0 >= VIEW_H) return;
    const rr = rng(Math.floor(t * 10));
    for (let y = Math.max(0, y0); y < VIEW_H; y += 4)
      for (let x = 0; x < VIEW_W; x += 4) {
        const v = rr();
        px(ctx, x, y, 4, 4, v < 0.45 ? P.paper : v < 0.75 ? P.gray : v < 0.9 ? P.lavender : P.ink);
      }
    // ragged edge with chromatic glitch bars
    for (let x = 0; x < VIEW_W; x += 8) {
      const d = Math.floor(rr() * 14);
      px(ctx, x, y0 - d, 8, d, rr() < 0.5 ? P.paper : P.gray);
    }
    for (let k = 0; k < 6; k++) {
      const gy = y0 - 10 - rr() * 40;
      px(ctx, rr() * VIEW_W, gy, 20 + rr() * 60, 2, k % 2 ? P.blue : P.pink);
    }
  };

  const drawGlass = (t: number) => {
    const goal = course.pieces[course.goal]!;
    const bottom = toScreen(goal.y);
    if (bottom <= 0) return;
    // behind the glass: Dameo's dim room at night, a lit window
    px(ctx, 0, 0, VIEW_W, bottom, P.black);
    for (let y = 0; y < bottom; y += 2) px(ctx, 0, y, VIEW_W, 1, mix(P.black, P.room, 0.25));
    const wx = 150;
    const wy = bottom - 150;
    px(ctx, wx, wy, 120, 80, P.room);
    px(ctx, wx + 4, wy + 4, 112, 72, mix(P.room, P.sky, 0.25));
    for (let s = 0; s < 72; s += 6) px(ctx, wx + 4, wy + 4 + s, 112, 2, mix(P.room, P.black, 0.3));
    // glare on the glass
    for (let k = 0; k < 3; k++) {
      const gx = ((k * 170 + t * 8) % (VIEW_W + 120)) - 60;
      poly(
        ctx,
        [
          [gx, 0],
          [gx + 18, 0],
          [gx - 40, bottom],
          [gx - 58, bottom],
        ],
        mix(P.black, P.paper, 0.08),
      );
    }
  };

  const drawHero = (run: RunState, dt: number) => {
    const b = run.body;
    const moving = Math.abs(b.vx) > 1;
    walkClock = moving && b.onGround ? walkClock + dt : 0;
    const walk = !b.onGround ? 1 : moving ? Math.floor(walkClock * 10) % 4 : -1;
    const emotion = run.section >= 5 ? 'scared' : 'angry';
    const frame = spriteFrame('dameo', { facing: 'side', emotion, walk, breath: 0, mouthOpen: false });
    const x = Math.round(b.x + b.w / 2 - frame.width / 2);
    const y = toScreen(b.y + b.h) - frame.height;
    if (run.facing < 0) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(frame, -x - frame.width, y);
      ctx.restore();
    } else ctx.drawImage(frame, x, y);
  };

  return {
    draw(run, dt) {
      const t = run.t;
      const b = run.body;
      const target = Math.max(0, Math.min(course.height - VIEW_H, b.y + b.h - VIEW_H * 0.68));
      camY = Math.abs(target - camY) > VIEW_H ? target : camY + (target - camY) * Math.min(1, dt * 8);

      ctx.drawImage(sky, 0, -Math.round(camY * PARALLAX));
      // spinning shapes and twinkles in the middle distance
      for (const s of spinners) {
        const y = Math.round(s.y - camY * PARALLAX * 0.85);
        if (y < -20 || y > VIEW_H + 20 || s.y < course.height * PARALLAX * 0.1) continue;
        const a = reduceMotion ? 0 : t * s.speed;
        poly(ctx, shape(s.x, y, s.s, s.sides, a), shade(P.candy[s.c]!, 0.35));
        poly(ctx, shape(s.x, y, s.s * 0.45, s.sides, a), P.paper);
      }
      for (const s of sparkles) {
        const y = toScreen(s.y);
        if (y < -6 || y > VIEW_H) continue;
        const on = reduceMotion || Math.sin(t * 3 + s.p * 6) > 0.2;
        if (on) bitmap(ctx, s.c % 2 ? SPARKLE : SPARKLE_S, s.x, y, { x: P.candy[s.c]!, o: '#ffffff' });
      }
      drawGlass(t);
      for (const p of course.pieces) drawTrack(p);
      const hubs = new Map<string, { cx: number; cy: number; r: number; dir: number }>();
      for (const p of course.pieces)
        if (p.motion.kind === 'orbit') hubs.set(`${p.motion.cx},${p.motion.cy}`, { cx: p.motion.cx, cy: p.motion.cy, r: p.motion.r, dir: p.motion.dir });
      for (const h of hubs.values()) {
        for (const p of course.pieces) {
          if (p.motion.kind !== 'orbit' || p.motion.cx !== h.cx || p.motion.cy !== h.cy) continue;
          const rr = pieceRect(p, t);
          const sx = rr.x + rr.w / 2;
          const sy = toScreen(rr.y + 6);
          const n = Math.ceil(Math.hypot(sx - h.cx, sy - toScreen(h.cy)) / 2);
          for (let k = 0; k < n; k++) px(ctx, h.cx + ((sx - h.cx) * k) / n, toScreen(h.cy) + ((sy - toScreen(h.cy)) * k) / n, 1, 1, k % 4 < 2 ? P.paper : P.pink);
        }
        drawHub(h.cx, h.cy, h.r, reduceMotion ? 0 : t, h.dir);
      }
      course.pieces.forEach((p, i) => {
        const gone = run.goneUntil[i]! > t;
        if (gone && !wasGone[i] && !reduceMotion) {
          const rr = pieceRect(p, t);
          for (let k = 0; k < 10; k++)
            shards.push({ x: rr.x + (k / 10) * p.w, y: rr.y, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 60, c: P.candy[(k + p.variant) % 6]!, born: t });
        }
        wasGone[i] = gone;
        drawPiece(p, i, run);
      });
      course.sections.forEach((s, k) => {
        if (k > 0) drawFlag(course.pieces[s.spawn]!, run.section >= k, t);
      });
      for (let k = shards.length - 1; k >= 0; k--) {
        const s = shards[k]!;
        const age = t - s.born;
        if (age > 1.2 || age < 0) {
          shards.splice(k, 1);
          continue;
        }
        const x = s.x + s.vx * age;
        const y = s.y + s.vy * age + 450 * age * age;
        poly(
          ctx,
          [
            [x, toScreen(y)],
            [x + 5, toScreen(y)],
            [x + 2, toScreen(y) + 5],
          ],
          s.c,
        );
      }
      drawHero(run, dt);
      if (Number.isFinite(run.hazardY)) drawErasure(run.hazardY, t);
      // a heart counter of checkpoints in the corner
      for (let k = 1; k < course.sections.length; k++) bitmap(ctx, HEART, 6 + (k - 1) * 9, 6, { x: run.section >= k ? P.pink : shade(P.gray, -0.1), o: P.paper });
    },
  };
}

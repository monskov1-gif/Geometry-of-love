// Mini-game No. 1 «Выход»: the dotted trajectory drawn for every moving
// platform is exactly the set of places its collision box takes.
// Regression: the second cloud of «Облака» (phase 0.5) had its dots drawn
// from where it stood at t = 0 — 200 px to the right of its real path.
import { describe, expect, it } from 'vitest';
import { artFrame } from '../../game/src/episodes/exit-art';
import { anchorOf, buildCourse, motionPeriod, pieceRect, trackPoints, type Piece, type Point } from '../../game/src/episodes/exit-course';

const course = buildCourse();
const moving = course.pieces.map((p, i) => ({ p, i })).filter(({ p }) => motionPeriod(p.motion) !== null);

function distToSegment(q: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const k = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / len2));
  return Math.hypot(q.x - (a.x + dx * k), q.y - (a.y + dy * k));
}

/** Distance from a point to the drawn track (closed for wheels). */
function distToTrack(q: Point, track: Point[], closed: boolean): number {
  let best = Infinity;
  const n = closed ? track.length : track.length - 1;
  for (let i = 0; i < n; i++) best = Math.min(best, distToSegment(q, track[i]!, track[(i + 1) % track.length]!));
  return best;
}

/** Anchors of the collision box sampled over one full period. */
function samples(p: Piece, count = 600): Point[] {
  const period = motionPeriod(p.motion)!;
  return Array.from({ length: count }, (_, k) => anchorOf(pieceRect(p, (k / count) * period)));
}

describe('«Выход»: trajectories of moving platforms', () => {
  it('there are moving platforms of both kinds (clouds/lift slide, star seats orbit)', () => {
    expect(moving.filter(({ p }) => p.motion.kind === 'slide').length).toBeGreaterThanOrEqual(3);
    expect(moving.filter(({ p }) => p.motion.kind === 'orbit').length).toBe(8);
  });

  it('every sampled position of every moving platform lies on its drawn track', () => {
    const bad: string[] = [];
    for (const { p, i } of moving) {
      const track = trackPoints(p);
      const closed = p.motion.kind === 'orbit';
      for (const q of samples(p)) {
        const d = distToTrack(q, track, closed);
        if (d > 0.25) {
          bad.push(`piece ${i} (${p.look}) at (${q.x.toFixed(1)}, ${q.y.toFixed(1)}) is ${d.toFixed(1)} px off its track`);
          break;
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('the track does not reach past the motion: every dot is a place the platform really visits', () => {
    const bad: string[] = [];
    for (const { p, i } of moving) {
      const visited = samples(p, 2000);
      for (const dot of trackPoints(p)) {
        const d = Math.min(...visited.map((q) => Math.hypot(q.x - dot.x, q.y - dot.y)));
        if (d > 0.5) {
          bad.push(`piece ${i} (${p.look}): dot (${dot.x.toFixed(1)}, ${dot.y.toFixed(1)}) is never visited (${d.toFixed(1)} px away)`);
          break;
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('slides reach both ends of their track; seats go all the way round their wheel', () => {
    for (const { p } of moving) {
      const track = trackPoints(p);
      const visited = samples(p, 2000);
      const near = (dot: Point) => Math.min(...visited.map((q) => Math.hypot(q.x - dot.x, q.y - dot.y)));
      if (p.motion.kind === 'slide') {
        expect(near(track[0]!)).toBeLessThan(0.5);
        expect(near(track.at(-1)!)).toBeLessThan(0.5);
      } else if (p.motion.kind === 'orbit') {
        const m = p.motion;
        for (const q of visited) expect(Math.hypot(q.x - m.cx, q.y - m.cy)).toBeCloseTo(m.r, 6);
      }
    }
  });

  it('the phase-shifted cloud of «Облака» is drawn where it actually flies', () => {
    const cloud = moving.find(({ p }) => p.look === 'cloud' && p.motion.kind === 'slide' && p.motion.phase === 0.5)!.p;
    const track = trackPoints(cloud);
    const xs = track.map((d) => d.x);
    const flown = samples(cloud).map((q) => q.x);
    expect(Math.min(...xs)).toBeCloseTo(Math.min(...flown), 0);
    expect(Math.max(...xs)).toBeCloseTo(Math.max(...flown), 0);
  });

  it('the art of every platform sits on its collision box (outline pixel aside)', () => {
    for (const p of course.pieces) {
      const f = artFrame(p);
      const r = pieceRect(p, 1.234);
      // the image starts one outline pixel left of the box and ends one pixel right of it
      expect(r.x + f.ox).toBe(r.x - 1);
      expect(f.w).toBe(p.w + 2);
      // the standing surface of the art is the top of the collision box
      expect(f.oy).toBeLessThan(0);
      expect(f.h + f.oy).toBeGreaterThanOrEqual(p.look === 'wall' || p.look === 'glass' ? p.h : 8);
    }
  });
});

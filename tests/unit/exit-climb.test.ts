// Mini-game No. 1 «Выход»: the course is fair (every jump fits the physics),
// a scripted player can finish it, checkpoints and hazards behave.
import { describe, expect, it } from 'vitest';
import {
  BODY_H,
  BODY_W,
  blinkOn,
  buildCourse,
  CLIMB_PHYS,
  CRUMBLE_BACK,
  CRUMBLE_TIME,
  pieceRect,
  type Course,
  type Piece,
} from '../../game/src/episodes/exit-course';
import { isSolid, startRun, stepRun, type RunState } from '../../game/src/episodes/exit-run';
import { canJump, jumpTime, maxJumpHeight } from '../../game/src/episodes/physics';

const course = buildCourse();
const DT = 1 / 60;

/** Seats of one wheel are interchangeable for the route. */
function group(c: Course, i: number): number[] {
  const m = c.pieces[i]!.motion;
  if (m.kind !== 'orbit') return [i];
  return c.pieces.flatMap((p, j) => (p.motion.kind === 'orbit' && p.motion.cx === m.cx && p.motion.cy === m.cy ? [j] : []));
}

function hopFeasible(a: Piece, b: Piece, margin = 0.85): boolean {
  for (let t = 0; t < 30; t += 0.05) {
    if (!blinkOn(a, t) || !blinkOn(a, t - 0.3)) continue;
    const ra = pieceRect(a, t);
    let rb = pieceRect(b, t);
    let T: number | null = null;
    for (let k = 0; k < 3; k++) {
      T = jumpTime(ra.y - rb.y, CLIMB_PHYS);
      if (T === null) break;
      rb = pieceRect(b, t + T);
    }
    if (T === null || !blinkOn(b, t + T) || !blinkOn(b, t + T + 0.25)) continue;
    if (canJump(ra, rb, CLIMB_PHYS, BODY_W, margin)) return true;
  }
  return false;
}

describe('«Выход»: course', () => {
  it('has six sections, each starting on a static checkpoint ledge', () => {
    expect(course.sections).toHaveLength(6);
    for (const s of course.sections) expect(course.pieces[s.spawn]!.motion.kind).toBe('static');
    expect(course.sections.at(-1)!.route.at(-1)).toBe(course.goal);
    for (let i = 1; i < course.sections.length; i++) expect(course.sections[i - 1]!.route.at(-1)).toBe(course.sections[i]!.spawn);
  });

  it('every hop of the route fits one jump with 15 % spare', () => {
    const bad: string[] = [];
    course.sections.forEach((s, k) => {
      for (let i = 1; i < s.route.length; i++) {
        const ok = group(course, s.route[i - 1]!).some((a) => group(course, s.route[i]!).some((b) => hopFeasible(course.pieces[a]!, course.pieces[b]!)));
        if (!ok) bad.push(`section ${k}: ${s.route[i - 1]} → ${s.route[i]}`);
      }
    });
    expect(bad).toEqual([]);
  });

  it('a jump is ~104 px high, more than a step and less than the window walls', () => {
    const h = maxJumpHeight(CLIMB_PHYS);
    expect(h).toBeGreaterThan(100);
    for (const p of course.pieces.filter((p) => p.wall)) expect(p.h).toBeGreaterThan(h);
  });

  it('window walls stay closed long enough to walk past them', () => {
    for (const p of course.pieces.filter((p) => p.wall)) {
      const m = p.motion;
      expect(m.kind).toBe('blink');
      if (m.kind === 'blink') expect(m.off).toBeGreaterThan((p.w + BODY_W) / CLIMB_PHYS.moveSpeed + 0.8);
    }
  });

  it('blinking platforms of the two groups overlap, so a chain of them is never a dead end', () => {
    const pops = course.pieces.filter((p) => p.look === 'popup');
    for (let t = 0; t < 10; t += 0.05) expect(pops.some((p) => blinkOn(p, t))).toBe(true);
  });

  it('the erasure is slower than the climb', () => {
    const last = course.sections.at(-1)!;
    const hz = last.hazard!;
    const top = course.pieces[course.goal]!.y;
    const hops = last.route.length - 1;
    const erasureTime = hz.delay + (hz.startY - top) / hz.speed;
    expect(erasureTime).toBeGreaterThan(hops * 1.6);
  });

  it('crumbling tiles exist only in the triangle and shaft sections', () => {
    const sections = new Set(course.pieces.filter((p) => p.crumble).map((p) => p.section));
    expect([...sections].sort()).toEqual([2, 5]);
  });
});

/** A simple scripted player: walks to the edge, jumps when the next piece is in reach, steers in the air. */
function playBot(maxTime = 400): { run: RunState; won: boolean } {
  const route = course.sections.flatMap((s, k) => (k === 0 ? s.route : s.route.slice(1)));
  const run = startRun(course);
  let k = 0;
  let aim = -1;
  const speed = CLIMB_PHYS.moveSpeed;
  while (run.t < maxTime) {
    const b = run.body;
    let dir = 0;
    let jump = false;
    if (b.onGround && b.standingOn >= 0) {
      const at = route.findIndex((r) => group(course, r).includes(b.standingOn));
      if (at >= 0) k = at;
      aim = -1;
      const next = route[k + 1];
      if (next !== undefined) {
        const here = pieceRect(course.pieces[b.standingOn]!, run.t);
        for (const n of group(course, next)) {
          const p = course.pieces[n]!;
          let rb = pieceRect(p, run.t);
          let T: number | null = null;
          for (let i = 0; i < 3; i++) {
            T = b.y + b.h - rb.y > maxJumpHeight(CLIMB_PHYS) * 0.9 ? null : jumpTime(b.y + b.h - rb.y, CLIMB_PHYS);
            if (T === null) break;
            rb = pieceRect(p, run.t + T);
          }
          const lo = rb.x - b.w + 6;
          const hi = rb.x + rb.w - 6;
          if (T !== null && T > 0.15 && blinkOn(p, run.t + T - 0.15) && blinkOn(p, run.t + T + 0.3) && b.x + speed * T * 0.9 >= lo && b.x - speed * T * 0.9 <= hi) {
            jump = true;
            aim = n;
            break;
          }
        }
        if (!jump) {
          const target = pieceRect(course.pieces[next]!, run.t);
          const want = target.x + target.w / 2 > b.x + b.w / 2 ? 1 : -1;
          const nextX = b.x + want * speed * DT;
          dir = nextX + b.w / 2 >= here.x + 2 && nextX + b.w / 2 <= here.x + here.w - 2 ? want : 0;
        }
      }
    } else if (aim >= 0) {
      const r = pieceRect(course.pieces[aim]!, run.t);
      const diff = r.x + r.w / 2 - (b.x + b.w / 2);
      dir = Math.abs(diff) > 3 ? Math.sign(diff) : 0;
    }
    const ev = stepRun(course, run, { dir, jumpPressed: jump }, DT);
    if (ev === 'success') return { run, won: true };
  }
  return { run, won: false };
}

describe('«Выход»: play-through', () => {
  it('a scripted player reaches the monitor glass', () => {
    const { run, won } = playBot();
    expect(won).toBe(true);
    // Not a 20-second ladder any more, but not an endurance test either.
    expect(run.t).toBeGreaterThan(40);
    expect(run.respawns).toBe(0);
    expect(run.t).toBeLessThan(180);
  });

  it('a passive player never finishes and stays at the start', () => {
    const run = startRun(course);
    for (let t = 0; t < 20; t += DT) expect(stepRun(course, run, { dir: 0, jumpPressed: false }, DT)).not.toBe('success');
    expect(run.section).toBe(0);
  });

  it('a moving cloud carries the body standing on it', () => {
    const cloud = course.pieces.findIndex((p) => p.look === 'cloud');
    const run = startRun(course, 1);
    const r = pieceRect(course.pieces[cloud]!, 0);
    run.body = { ...run.body, x: r.x + 10, y: r.y - BODY_H, standingOn: cloud, onGround: true };
    const x0 = run.body.x;
    for (let i = 0; i < 30; i++) stepRun(course, run, { dir: 0, jumpPressed: false }, DT);
    const r2 = pieceRect(course.pieces[cloud]!, run.t);
    expect(run.body.onGround).toBe(true);
    expect(run.body.x - x0).toBeCloseTo(r2.x - r.x, 0);
  });

  it('a crumbling tile breaks after standing on it, grows back later', () => {
    const i = course.pieces.findIndex((p) => p.crumble);
    const run = startRun(course, 2);
    const r = pieceRect(course.pieces[i]!, 0);
    run.body = { ...run.body, x: r.x + 10, y: r.y - BODY_H, standingOn: i, onGround: true };
    let t = 0;
    while (t < CRUMBLE_TIME - 0.05) {
      stepRun(course, run, { dir: 0, jumpPressed: false }, DT);
      t += DT;
    }
    expect(isSolid(course, run, i)).toBe(true);
    for (let k = 0; k < 6; k++) stepRun(course, run, { dir: 0, jumpPressed: false }, DT);
    expect(isSolid(course, run, i)).toBe(false);
    expect(isSolid(course, run, i, run.t + CRUMBLE_BACK + 0.1)).toBe(true);
  });

  it('a fall restarts the current section from its checkpoint, never an earlier one', () => {
    const run = startRun(course, 3);
    const spawn = course.pieces[course.sections[3]!.spawn]!;
    run.body = { ...run.body, x: 300, y: spawn.y + 50, onGround: false, standingOn: -1, vy: 400 };
    let ev = null;
    for (let i = 0; i < 120 && ev !== 'respawn'; i++) ev = stepRun(course, run, { dir: 0, jumpPressed: false }, DT);
    expect(ev).toBe('respawn');
    expect(run.section).toBe(3);
    expect(run.body.y + run.body.h).toBeCloseTo(spawn.y);
    expect(run.respawns).toBe(1);
  });

  it('the erasure catches a player who waits in the last section', () => {
    const run = startRun(course, 5);
    let ev = null;
    for (let t = 0; t < 30 && ev !== 'respawn'; t += DT) ev = stepRun(course, run, { dir: 0, jumpPressed: false }, DT);
    expect(ev).toBe('respawn');
    expect(run.section).toBe(5);
  });

  it('an open window wall stops the walk; a closed one lets the body pass', () => {
    const wi = course.pieces.findIndex((p) => p.wall);
    const wall = course.pieces[wi]!;
    const run = startRun(course, 4);
    const ledge = course.pieces.findIndex((p) => p.look === 'cake' && p.section === 4 && p.w > 200);
    const lr = pieceRect(course.pieces[ledge]!, 0);
    run.body = { ...run.body, x: wall.x + wall.w + 2, y: lr.y - BODY_H, standingOn: ledge, onGround: true };
    // wall phase 0: open during the first 2 s
    for (let i = 0; i < 30; i++) stepRun(course, run, { dir: -1, jumpPressed: false }, DT);
    expect(run.body.x).toBeGreaterThanOrEqual(wall.x + wall.w - 0.01);
    // wait until it closes, then walk through
    while (blinkOn(wall, run.t)) stepRun(course, run, { dir: 0, jumpPressed: false }, DT);
    for (let i = 0; i < 30; i++) stepRun(course, run, { dir: -1, jumpPressed: false }, DT);
    expect(run.body.x + run.body.w).toBeLessThan(wall.x);
  });

  it('a jump pressed just before landing still happens (buffer) and works just after an edge (coyote)', () => {
    const run = startRun(course);
    run.body = { ...run.body, y: run.body.y - 6, onGround: false, standingOn: -1, vy: 200 };
    stepRun(course, run, { dir: 0, jumpPressed: true }, DT);
    let jumped = false;
    for (let i = 0; i < 10; i++) {
      stepRun(course, run, { dir: 0, jumpPressed: false }, DT);
      if (run.body.vy < -300) jumped = true;
    }
    expect(jumped).toBe(true);
  });
});

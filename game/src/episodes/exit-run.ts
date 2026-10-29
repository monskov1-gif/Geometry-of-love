// One play-through of «Выход»: body, time, checkpoints, crumbling tiles and
// the erasure of the last section. Pure (no DOM): the episode calls
// stepRun() every frame and only draws the result; tests drive it directly.
import { BODY_H, BODY_W, blinkOn, CLIMB_PHYS, CRUMBLE_BACK, CRUMBLE_TIME, pieceRect, VIEW_W, type Course } from './exit-course';
import { resolveSolids, stepBody, type Body, type Rect } from './physics';

export interface RunInput {
  dir: number;
  /** A jump was pressed since the last step (kept briefly as a buffer). */
  jumpPressed: boolean;
}

export interface RunState {
  t: number;
  body: Body;
  /** Current checkpoint section. */
  section: number;
  /** Seconds each crumbling tile has been stood on. */
  stood: number[];
  /** Time until which a broken tile is gone. */
  goneUntil: number[];
  /** Top of the erasure (last section), world y; Infinity when inactive. */
  hazardY: number;
  hazardClock: number;
  jumpBuffer: number;
  facing: 1 | -1;
  respawns: number;
  /** Highest point reached, world y of the feet. */
  best: number;
}

export type RunEvent = 'checkpoint' | 'respawn' | 'success' | null;

const JUMP_BUFFER = 0.12;

function spawnBody(course: Course, section: number, t: number): Body {
  const r = pieceRect(course.pieces[course.sections[section]!.spawn]!, t);
  const x = section === 0 ? 24 : r.x + r.w / 2 - BODY_W / 2;
  return { x, y: r.y - BODY_H, w: BODY_W, h: BODY_H, vx: 0, vy: 0, onGround: true, standingOn: course.sections[section]!.spawn, coyote: 0 };
}

export function startRun(course: Course, section = 0): RunState {
  const body = spawnBody(course, section, 0);
  return {
    t: 0,
    body,
    section,
    stood: course.pieces.map(() => 0),
    goneUntil: course.pieces.map(() => -1),
    hazardY: Infinity,
    hazardClock: 0,
    jumpBuffer: 0,
    facing: 1,
    respawns: 0,
    best: body.y + body.h,
  };
}

/** Is piece i solid at the run's current time? */
export function isSolid(course: Course, run: RunState, i: number, t = run.t): boolean {
  return blinkOn(course.pieces[i]!, t) && run.goneUntil[i]! <= t;
}

function restartSection(course: Course, run: RunState): void {
  run.body = spawnBody(course, run.section, run.t);
  run.stood.fill(0);
  run.goneUntil.fill(-1);
  run.hazardY = Infinity;
  run.hazardClock = 0;
  run.jumpBuffer = 0;
  run.respawns++;
}

export function stepRun(course: Course, run: RunState, input: RunInput, dt: number): RunEvent {
  const { pieces } = course;
  const t0 = run.t;
  const t1 = t0 + dt;
  if (input.jumpPressed) run.jumpBuffer = JUMP_BUFFER;
  else run.jumpBuffer = Math.max(0, run.jumpBuffer - dt);
  if (input.dir) run.facing = input.dir > 0 ? 1 : -1;

  // Ride the piece under the feet.
  let body = run.body;
  if (body.onGround && body.standingOn >= 0) {
    const a = pieceRect(pieces[body.standingOn]!, t0);
    const b = pieceRect(pieces[body.standingOn]!, t1);
    body = { ...body, x: Math.min(VIEW_W - body.w, Math.max(0, body.x + b.x - a.x)), y: body.y + b.y - a.y };
  }
  run.t = t1;
  const rects: (Rect & { solid: boolean })[] = pieces.map((p, i) => ({ ...pieceRect(p, t1), solid: isSolid(course, run, i) }));
  const canJump = body.onGround || (body.coyote ?? 0) > 0;
  const jump = run.jumpBuffer > 0;
  const prev = body;
  body = stepBody(body, { dir: input.dir, jump }, rects, dt, { minX: 0, maxX: VIEW_W }, CLIMB_PHYS);
  body = resolveSolids(
    prev,
    body,
    rects.filter((r, i) => r.solid && pieces[i]!.wall),
  );
  if (jump && canJump && body.vy < 0) run.jumpBuffer = 0;
  run.body = body;

  // Crumbling tiles.
  const on = body.onGround ? body.standingOn : -1;
  if (on >= 0 && pieces[on]!.crumble) {
    run.stood[on]! += dt;
    if (run.stood[on]! >= CRUMBLE_TIME) {
      run.goneUntil[on] = t1 + CRUMBLE_BACK;
      run.stood[on] = 0;
    }
  }
  for (let i = 0; i < pieces.length; i++) if (run.goneUntil[i]! > 0 && run.goneUntil[i]! <= t1 && i !== on) run.goneUntil[i] = -1;

  run.best = Math.min(run.best, body.y + body.h);
  if (on === course.goal) return 'success';

  let event: RunEvent = null;
  if (on >= 0 && pieces[on]!.section > run.section) {
    run.section = pieces[on]!.section;
    run.hazardY = Infinity;
    run.hazardClock = 0;
    event = 'checkpoint';
  }

  const section = course.sections[run.section]!;
  if (section.hazard) {
    run.hazardClock += dt;
    if (run.hazardClock >= section.hazard.delay) {
      run.hazardY = Math.min(run.hazardY, section.hazard.startY) - section.hazard.speed * dt;
    }
  }
  const feet = body.y + body.h;
  if (feet > section.fallY || feet > run.hazardY + 4) {
    restartSection(course, run);
    return 'respawn';
  }
  return event;
}

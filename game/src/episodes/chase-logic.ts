// Rules of Mini-game No. 5 «Погоня», in metres and seconds (the 3D scene uses
// the same numbers): Dameo runs right on his own; blocks and formulas must be
// jumped, lines of code must be ducked under; every hit lets Melody close in;
// if the gap reaches zero she has caught him and the run restarts.
// Pure functions: unit tests check that the course is fair and winnable.

export type ObstacleKind = 'block' | 'code' | 'formula';

export interface Obstacle {
  /** Left edge along the run, metres. */
  x: number;
  kind: ObstacleKind;
}

export interface ChaseConfig {
  mode: 'run' | 'car';
  /** Running speed, m/s. */
  speed: number;
  /** Course length, metres. */
  length: number;
  /** Melody's distance behind Dameo at the start, metres. */
  startGap: number;
  /** Metres Melody gains on each hit. */
  hitPenalty: number;
  /** Metres per second Melody gains by herself (the world falls apart faster than he runs). */
  creep: number;
}

export const CONFIGS: Record<ChaseConfig['mode'], ChaseConfig> = {
  run: { mode: 'run', speed: 6.5, length: 165, startGap: 7, hitPenalty: 2.3, creep: 0.05 },
  car: { mode: 'car', speed: 9.5, length: 190, startGap: 8, hitPenalty: 2.0, creep: 0.05 },
};

export const BODY = { height: 1.74, crouch: 0.95, width: 0.42 };
const JUMP_SPEED = 6.6;
const GRAVITY = 18;
/** Seconds in the air for one jump. */
export const AIR_TIME = (2 * JUMP_SPEED) / GRAVITY;
export const JUMP_HEIGHT = JUMP_SPEED ** 2 / (2 * GRAVITY);

/** What an obstacle occupies: from y0 to y1 above the floor, w metres along the run. */
export function obstacleBox(kind: ObstacleKind): { y0: number; y1: number; w: number } {
  if (kind === 'block') return { y0: 0, y1: 0.7, w: 0.7 }; // jump over it
  if (kind === 'code') return { y0: 1.08, y1: 1.5, w: 2.4 }; // a line of code at chest height: duck under it
  return { y0: 0, y1: 0.85, w: 0.75 }; // formula: only a jump clears it
}

/** Deterministic course: every obstacle leaves time to react, act and land. */
export function buildCourse(config: ChaseConfig): Obstacle[] {
  const kinds: ObstacleKind[] = config.mode === 'car' ? ['block', 'formula'] : ['block', 'code', 'formula', 'block', 'code'];
  const minGap = config.speed * (AIR_TIME + 0.55);
  const list: Obstacle[] = [];
  let x = 18;
  let i = 0;
  while (x < config.length - 12) {
    list.push({ x, kind: kinds[i % kinds.length]! });
    x += minGap + ((i * 37) % 9) * 0.5;
    i++;
  }
  return list;
}

export interface Runner {
  /** Feet height above the floor. */
  y: number;
  vy: number;
  crouching: boolean;
}

export function stepRunner(r: Runner, jump: boolean, crouch: boolean, dt: number): Runner {
  let { y, vy } = r;
  if (jump && y === 0) vy = JUMP_SPEED;
  vy -= GRAVITY * dt;
  y = Math.max(0, y + vy * dt);
  if (y === 0) vy = 0;
  return { y, vy, crouching: crouch && y === 0 };
}

/** Does the runner (whose front is at `distance`) overlap the obstacle? */
export function hits(r: Runner, o: Obstacle, distance: number): boolean {
  const b = obstacleBox(o.kind);
  const x0 = distance - BODY.width;
  const x1 = distance;
  if (x1 <= o.x || x0 >= o.x + b.w) return false;
  const top = r.y + (r.crouching ? BODY.crouch : BODY.height);
  return r.y < b.y1 && top > b.y0;
}

export interface ChaseState {
  distance: number;
  gap: number;
  runner: Runner;
  invulnerable: number;
  hitsTaken: number;
  /** Index of the next obstacle that has not been passed yet. */
  next: number;
}

export const startState = (config: ChaseConfig): ChaseState => ({
  distance: 0,
  gap: config.startGap,
  runner: { y: 0, vy: 0, crouching: false },
  invulnerable: 0,
  hitsTaken: 0,
  next: 0,
});

export type StepResult = 'running' | 'caught' | 'escaped';

/** One fixed step of the whole game. `hit` is called for every collision. */
export function stepChase(s: ChaseState, config: ChaseConfig, course: Obstacle[], input: { jump: boolean; crouch: boolean }, dt: number, hit?: (o: Obstacle) => void): StepResult {
  s.runner = stepRunner(s.runner, input.jump, input.crouch, dt);
  s.distance += config.speed * dt;
  s.gap -= config.creep * dt;
  s.invulnerable = Math.max(0, s.invulnerable - dt);
  while (s.next < course.length && course[s.next]!.x + obstacleBox(course[s.next]!.kind).w < s.distance - BODY.width) s.next++;
  for (let i = s.next; i < course.length && course[i]!.x < s.distance + 1; i++) {
    if (s.invulnerable === 0 && hits(s.runner, course[i]!, s.distance)) {
      s.gap -= config.hitPenalty;
      s.invulnerable = 0.8;
      s.hitsTaken++;
      hit?.(course[i]!);
    }
  }
  if (s.gap <= 0) return 'caught';
  if (s.distance >= config.length) return 'escaped';
  return 'running';
}

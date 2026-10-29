// Small, predictable platformer physics shared by the platformer episodes.
// One-way platforms (you land on top, pass through from below), y grows
// downwards like canvas coordinates. Solid boxes (walls) block from every
// side. Pure functions: unit-tested.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Body extends Rect {
  vx: number;
  vy: number;
  onGround: boolean;
  /** Index of the platform under the body, or -1. */
  standingOn: number;
  /** Seconds left in which a jump is still allowed after walking off an edge. */
  coyote?: number;
}

export interface PhysConfig {
  gravity: number;
  jumpSpeed: number;
  moveSpeed: number;
  maxFall: number;
  /** Grace time for a jump after leaving a platform, s (0 = none). */
  coyote?: number;
}

export const PHYS: PhysConfig = {
  gravity: 900,
  jumpSpeed: 330,
  moveSpeed: 110,
  maxFall: 520,
};

/** Highest rise of a jump, px. */
export const maxJumpHeight = (p: PhysConfig) => (p.jumpSpeed * p.jumpSpeed) / (2 * p.gravity);
/** Horizontal distance covered while airborne on a level jump, px. */
export const maxJumpReach = (p: PhysConfig) => ((2 * p.jumpSpeed) / p.gravity) * p.moveSpeed;

/** Highest rise of a jump with the default physics, px (≈ 60). */
export const MAX_JUMP_HEIGHT = maxJumpHeight(PHYS);
/** Horizontal distance of a level jump with the default physics, px (≈ 80). */
export const MAX_JUMP_REACH = maxJumpReach(PHYS);

export interface StepInput {
  dir: number; // -1, 0, 1
  jump: boolean; // jump requested this frame
}

export function stepBody(
  body: Body,
  input: StepInput,
  platforms: readonly (Rect & { solid?: boolean })[],
  dt: number,
  bounds: { minX: number; maxX: number },
  phys: PhysConfig = PHYS,
): Body {
  let { x, y, vx, vy, onGround, standingOn } = body;
  let coyote = onGround ? (phys.coyote ?? 0) : Math.max(0, (body.coyote ?? 0) - dt);
  vx = input.dir * phys.moveSpeed;
  if (input.jump && (onGround || coyote > 0)) {
    vy = -phys.jumpSpeed;
    onGround = false;
    coyote = 0;
  }
  vy = Math.min(phys.maxFall, vy + phys.gravity * dt);
  const prevBottom = y + body.h;
  x = Math.min(bounds.maxX - body.w, Math.max(bounds.minX, x + vx * dt));
  y += vy * dt;

  onGround = false;
  standingOn = -1;
  if (vy >= 0) {
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i]!;
      if (p.solid === false) continue;
      const overlaps = x + body.w > p.x && x < p.x + p.w;
      if (overlaps && prevBottom <= p.y + 0.01 && y + body.h >= p.y) {
        y = p.y - body.h;
        vy = 0;
        onGround = true;
        standingOn = i;
        coyote = phys.coyote ?? 0;
        break;
      }
    }
  }
  return { ...body, x, y, vx, vy, onGround, standingOn, coyote };
}

const overlap = (a: Rect, b: Rect) => a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;

/**
 * Pushes the body out of solid boxes after a step: a head bump stops the
 * rise, a side hit stops the walk. A box that appeared around the body
 * (a window popping up) pushes it out to the nearer side.
 */
export function resolveSolids(prev: Body, next: Body, solids: readonly Rect[]): Body {
  let b = next;
  for (const s of solids) {
    if (!overlap(b, s)) continue;
    if (prev.y >= s.y + s.h - 0.01) {
      b = { ...b, y: s.y + s.h, vy: Math.max(0, b.vy) };
    } else if (prev.y + prev.h <= s.y + 0.01) {
      b = { ...b, y: s.y - b.h, vy: 0, onGround: true };
    } else if (prev.x + prev.w <= s.x + 0.01) {
      b = { ...b, x: s.x - b.w };
    } else if (prev.x >= s.x + s.w - 0.01) {
      b = { ...b, x: s.x + s.w };
    } else {
      const left = b.x + b.w - s.x;
      const right = s.x + s.w - b.x;
      b = { ...b, x: left < right ? s.x - b.w : s.x + s.w };
    }
  }
  return b;
}

/** Time until the feet come back down to `rise` px above the take-off point, s (null = too high). */
export function jumpTime(rise: number, phys: PhysConfig): number | null {
  const d = phys.jumpSpeed * phys.jumpSpeed - 2 * phys.gravity * rise;
  if (d < 0) return null;
  return (phys.jumpSpeed + Math.sqrt(d)) / phys.gravity;
}

/**
 * Can a body of width `bodyW` standing on `from` land on `to` with one jump?
 * Uses the exact ballistic arc and a safety margin (0.85 = 15 % spare).
 */
export function canJump(from: Rect, to: Rect, phys: PhysConfig, bodyW: number, margin = 0.85): boolean {
  const rise = from.y - to.y;
  if (rise > maxJumpHeight(phys) * margin) return false;
  const t = jumpTime(Math.max(rise, -2000), phys);
  if (t === null) return false;
  const gap = Math.max(0, to.x - (from.x + from.w), from.x - (to.x + to.w));
  const travel = Math.max(0, gap - bodyW / 2);
  return travel <= phys.moveSpeed * t * margin;
}

/**
 * Checks that every platform can be reached by a jump from some platform
 * below it. Returns the indexes of unreachable platforms (empty = solvable).
 */
export function unreachablePlatforms(platforms: readonly Rect[], margin = 0.85): number[] {
  const order = platforms.map((p, i) => ({ p, i })).sort((a, b) => b.p.y - a.p.y);
  const reached = new Set<number>([order[0]!.i]);
  const bad: number[] = [];
  for (const { p, i } of order.slice(1)) {
    const ok = [...reached].some((j) => {
      const from = platforms[j]!;
      const rise = from.y - p.y;
      const gap = Math.max(0, Math.max(p.x - (from.x + from.w), from.x - (p.x + p.w)));
      return rise <= MAX_JUMP_HEIGHT * margin && gap <= MAX_JUMP_REACH * margin * 0.5;
    });
    if (ok) reached.add(i);
    else bad.push(i);
  }
  return bad;
}

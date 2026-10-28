// Small, predictable platformer physics shared by the platformer episodes.
// One-way platforms (you land on top, pass through from below), y grows
// downwards like canvas coordinates. Pure functions: unit-tested.

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
}

export const PHYS = {
  gravity: 900,
  jumpSpeed: 330,
  moveSpeed: 110,
  maxFall: 520,
};

/** Highest rise of a jump, px (≈ 60). */
export const MAX_JUMP_HEIGHT = (PHYS.jumpSpeed * PHYS.jumpSpeed) / (2 * PHYS.gravity);
/** Horizontal distance covered while airborne on a level jump, px (≈ 80). */
export const MAX_JUMP_REACH = ((2 * PHYS.jumpSpeed) / PHYS.gravity) * PHYS.moveSpeed;

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
): Body {
  let { x, y, vx, vy, onGround, standingOn } = body;
  vx = input.dir * PHYS.moveSpeed;
  if (input.jump && onGround) {
    vy = -PHYS.jumpSpeed;
    onGround = false;
  }
  vy = Math.min(PHYS.maxFall, vy + PHYS.gravity * dt);
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
        break;
      }
    }
  }
  return { ...body, x, y, vx, vy, onGround, standingOn };
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

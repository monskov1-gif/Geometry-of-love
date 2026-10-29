// Draws the game's pixel characters (render/sprites) into canvas episodes:
// 1:1 pixels, feet on a ground line, mirrored when walking left, the walk cycle
// from the distance covered, a contact shadow. Never scaled or recoloured.
import { spriteFrame, spriteSize, type Emotion } from '../render/sprites';

export interface ActorPose {
  /** -1 left, 1 right, 0 facing the player. */
  dir: -1 | 0 | 1;
  /** Walk phase 0…3, or -1 standing. */
  walk: number;
  emotion?: Emotion;
  breath?: 0 | 1;
  mouthOpen?: boolean;
}

/** Walk phase from distance walked: one step every `stride` px. */
export const walkPhase = (distance: number, stride = 9) => Math.floor(Math.abs(distance) / stride) % 4;

/** Draws `id` with its feet centred at (x, feetY). */
export function drawActor(ctx: CanvasRenderingContext2D, id: string, x: number, feetY: number, pose: ActorPose): void {
  const { w, h } = spriteSize(id);
  const frame = spriteFrame(id, {
    facing: pose.dir === 0 ? 'front' : 'side',
    emotion: pose.emotion ?? 'neutral',
    walk: pose.dir === 0 ? -1 : pose.walk,
    breath: pose.breath ?? 0,
    mouthOpen: pose.mouthOpen ?? false,
  });
  const left = Math.round(x - w / 2);
  const top = Math.round(feetY - h);
  // soft contact shadow
  ctx.fillStyle = 'rgba(48,36,59,0.28)';
  ctx.fillRect(left + 4, Math.round(feetY) - 1, w - 8, 2);
  ctx.fillRect(left + 7, Math.round(feetY) + 1, w - 14, 1);
  if (pose.dir < 0) {
    ctx.save();
    ctx.translate(left + w, top);
    ctx.scale(-1, 1);
    ctx.drawImage(frame, 0, 0);
    ctx.restore();
  } else ctx.drawImage(frame, left, top);
}

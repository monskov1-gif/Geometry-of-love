import type { SpaceId } from '../../core/types';
import type { Painter } from '../painter';
import type { Lighting } from '../props';

/** A painted 2.5D location with lighting states and an optional animated layer. */
export interface LocationDef {
  id: string;
  space: SpaceId;
  lightings: Lighting[];
  defaultLighting: Lighting;
  /** Static layer. `variant` lets a scene tweak details (e.g. the app on the monitor). */
  paint(pt: Painter, light: Lighting, variant: string | undefined): void;
  /** Animated layer, cleared and redrawn ~12 times per second. */
  animate?(pt: Painter, t: number, light: Lighting, variant: string | undefined): void;
}

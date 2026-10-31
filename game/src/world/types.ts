// Shared types of the 3D world: a location is built once into a THREE.Group and
// publishes camera shots and marks (where characters stand), like the kit's
// examples publish walk areas, spots and anchors.
import type * as THREE from 'three';
import type { LocationKit } from './kit/location-kit';
import type { AppScreen } from './app-screen';

export type Vec3 = [number, number, number];

export interface Shot {
  pos: Vec3;
  look: Vec3;
  fov?: number;
  /**
   * Width and height (metres) of a box around `look` that must stay in frame on
   * any screen shape: the camera keeps the direction from `look` to `pos` and
   * moves to the distance at which the box just fits (phones get the whole
   * monitor instead of a crop of it).
   */
  fit?: [number, number];
  /**
   * With `fit`: where the box centre sits vertically in the frame (0 top … 1
   * bottom; default 0.5). Lifts the subject above the dialogue band, which is
   * taller on phones.
   */
  frameY?: number;
  /** No idle camera sway (a picture the player reads, e.g. the app on the CRT). */
  still?: boolean;
}

/** A place a character stands: floor point and which way they face by default. */
export interface Mark {
  x: number;
  z: number;
  facing?: 'front' | 'left' | 'right' | 'back';
}

export interface LocationBuild {
  kit: LocationKit;
  /** Named camera shots; 'wide' is the default framing. */
  shots: Record<string, Shot> & { wide: Shot };
  /** Stage positions (left / center / right) plus named marks used by cutscenes. */
  marks: Record<string, Mark> & { left: Mark; center: Mark; right: Mark };
  /** Walkable strip for interactive episodes and cutscene moves. */
  walk: { minX: number; maxX: number; z: number };
  /** Per-frame animation of the location itself (dust, flicker, screen noise). */
  update?: (dt: number, t: number) => void;
  /** Story hooks: `variant` changes (the monitor shows the app, a door closes…). */
  setVariant?: (variant: string | null) => void;
  /** Interactive episodes report the player's x (the world reacts: tiles fall behind him). */
  track?: (x: number) => void;
  /** A computer screen in the scene that shows the app (Dameo's CRT). */
  screen?: { app: AppScreen; corners: THREE.Vector3[] };
  /** Objects that the render must not reuse once the location is gone. */
  dispose?: () => void;
  /**
   * The camera "film" of this place: tone-mapping exposure and bloom (strength,
   * threshold). Pale candy rooms need a high threshold, or every pastel wall blooms
   * into a white haze. Defaults: {@link DEFAULT_LOOK}.
   */
  look?: Partial<LocationLook>;
}

export interface LocationLook {
  exposure: number;
  bloom: number;
  threshold: number;
}

export const DEFAULT_LOOK: LocationLook = { exposure: 1.05, bloom: 0.5, threshold: 0.8 };

export interface LocationDef3D {
  id: string;
  states: string[];
  defaultState: string;
  build(root: THREE.Group, opts: { low: boolean }): LocationBuild;
}

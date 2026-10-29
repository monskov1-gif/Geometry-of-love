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
}

/** A place a character stands: floor point and which way they face by default. */
export interface Mark {
  x: number;
  z: number;
  facing?: 'front' | 'left' | 'right';
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
  /** A computer screen in the scene that shows the app (Dameo's CRT). */
  screen?: { app: AppScreen; corners: THREE.Vector3[] };
  /** Objects that the render must not reuse once the location is gone. */
  dispose?: () => void;
}

export interface LocationDef3D {
  id: string;
  states: string[];
  defaultState: string;
  build(root: THREE.Group, opts: { low: boolean }): LocationBuild;
}

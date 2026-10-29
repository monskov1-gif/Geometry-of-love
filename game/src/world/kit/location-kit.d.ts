// Types for the vendored location kit (location-kit.js, plain JS from the author's kit).
// Loose on purpose: the kit is a builder API with many optional arguments; locations in
// game/src/world/locations use it the way the kit's examples do.
import type * as THREE from 'three';

export type KitState = 'evening' | 'night' | 'day' | (string & {});

export interface LightZone {
  [k: string]: unknown;
}

export class LocationKit {
  constructor(root: THREE.Object3D, opts?: { low?: boolean; ambient?: Record<string, unknown> });
  root: THREE.Object3D;
  low: boolean;
  state: KitState;
  background: number;
  fog: THREE.Fog | null | undefined;
  ambient: Record<string, { sky: number; ground: number; hemi: number; fill: number; fillI: number; bg: number }>;
  hemi?: import('three').HemisphereLight;
  fill?: import('three').DirectionalLight;
  lamps: { id: string; level: number }[];
  windowLights: LightZone[];
  camera?: { pos: [number, number, number]; look: [number, number, number] };
  groundAt?: (x: number, z: number) => number;
  setupLights(): void;
  setState(name: KitState): void;
  setLamp(id: string, level: number | null): void;
  update(dt: number): void;
  flushBatches(): void;
  onState(fn: (state: string) => void): void;
  withT(x: number, z: number, ry: number, fn: () => void, y?: number): void;
  P(x: number, y: number, z: number): THREE.Vector3;
  mat(key: string, params: Record<string, unknown>): THREE.Material;
  M(key: string, color: number, o?: Record<string, unknown>): THREE.MeshStandardMaterial;
  texM(key: string, map: THREE.Texture, o?: Record<string, unknown>): THREE.MeshStandardMaterial;
  glowM(key: string, color: number, emissive: number, o?: Record<string, unknown>): THREE.MeshStandardMaterial;
  // Builders and helpers: signatures in location-kit.js, usage in .claude/skills/location-kit/SKILL.md.
  _add(...args: any[]): any;
  bed(...args: any[]): any;
  book(...args: any[]): any;
  bookRow(...args: any[]): any;
  bookStack(...args: any[]): any;
  bookcase(...args: any[]): any;
  brightWindow(...args: any[]): any;
  bx(...args: any[]): any;
  candle(...args: any[]): any;
  ceilingPoly(...args: any[]): any;
  chair(...args: any[]): any;
  coffeeTable(...args: any[]): any;
  column(...args: any[]): any;
  cush(...args: any[]): any;
  cy(...args: any[]): any;
  desk(...args: any[]): any;
  drape(...args: any[]): any;
  dresser(...args: any[]): any;
  exitSign(...args: any[]): any;
  extinguisher(...args: any[]): any;
  fairyLights(...args: any[]): any;
  floorPoly(...args: any[]): any;
  floorRect(...args: any[]): any;
  fluorescent(...args: any[]): any;
  framed(...args: any[]): any;
  halo(...args: any[]): any;
  lamp(...args: any[]): any;
  lathe(...args: any[]): any;
  mug(...args: any[]): any;
  nightstand(...args: any[]): any;
  panelDoor(...args: any[]): any;
  partition(...args: any[]): any;
  pendant(...args: any[]): any;
  pl(...args: any[]): any;
  plant(...args: any[]): any;
  pointLight(...args: any[]): any;
  radiator(...args: any[]): any;
  rb(...args: any[]): any;
  rod(...args: any[]): any;
  rug(...args: any[]): any;
  sideWall(...args: any[]): any;
  slope(...args: any[]): any;
  sofa(...args: any[]): any;
  sph(...args: any[]): any;
  stairs(...args: any[]): any;
  statePool(...args: any[]): any;
  tableLamp(...args: any[]): any;
  torchiere(...args: any[]): any;
  torus(...args: any[]): any;
  trims(...args: any[]): any;
  tube(...args: any[]): any;
  turnedLeg(...args: any[]): any;
  tvUnit(...args: any[]): any;
  viewPlane(...args: any[]): any;
  wainscot(...args: any[]): any;
  wall(...args: any[]): any;
  wallPoly(...args: any[]): any;
  windowUnit(...args: any[]): any;
  glass(...args: any[]): any;
  brass(...args: any[]): any;
  white(...args: any[]): any;
  applyLamp(...args: any[]): any;
}
export { LocationKit as FurnitureKit };

export const TEX: {
  planks(...args: any[]): THREE.Texture;
  paint(...args: any[]): THREE.Texture;
  terracotta(...args: any[]): THREE.Texture;
  redTile(...args: any[]): THREE.Texture;
  oak(...args: any[]): THREE.Texture;
  darkWood(...args: any[]): THREE.Texture;
  stained(...args: any[]): THREE.Texture;
  blinds(...args: any[]): THREE.Texture;
  stripes(...args: any[]): THREE.Texture;
  ticking(...args: any[]): THREE.Texture;
  shag(...args: any[]): THREE.Texture;
  carpet(...args: any[]): THREE.Texture;
  jute(...args: any[]): THREE.Texture;
  plaid(...args: any[]): THREE.Texture;
  quilt(...args: any[]): THREE.Texture;
  coir(...args: any[]): THREE.Texture;
  paper(...args: any[]): THREE.Texture;
  leaf(...args: any[]): THREE.Texture;
  mirror(...args: any[]): THREE.Texture;
  roman(...args: any[]): THREE.Texture;
  art(...args: any[]): THREE.Texture;
  view(...args: any[]): THREE.Texture;
  shaft(...args: any[]): THREE.Texture;
};
export const AMBIENT: Record<string, { sky: number; ground: number; hemi: number; fill: number; fillI: number; bg: number }>;
export const WINDOW_PROFILES: Record<string, unknown>;
export const FLARE_PROFILES: Record<string, unknown>;
export const BOOK_COLS: number[];
export function rgb(r: number, g: number, b: number, a?: number): string;
export function rng(seed?: number): () => number;
export function canvasTexture(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  o?: { repeat?: [number, number]; color?: boolean; aniso?: number; nearest?: boolean },
): THREE.CanvasTexture;
export function TX(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  o?: Record<string, unknown>,
): THREE.CanvasTexture;
export function pixelate(ctx: CanvasRenderingContext2D, w: number, h: number, k?: number): void;
export function glow(color: number, size: number, opacity?: number): THREE.Sprite;
export function lightPool(color: number, w: number, h: number, opacity?: number): THREE.Mesh;
export function noise3(x: number, y: number, z: number, s?: number): number;
export function fbm3(x: number, y: number, z: number, s?: number, oct?: number): number;
export function sanitizeNormals(root: THREE.Object3D): void;
export function roundedBox(w: number, h: number, d: number, rad?: number, seg?: number): THREE.BufferGeometry;
export function bevelBox(w: number, h: number, d: number): THREE.BufferGeometry;
export function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry;
export function townView(time: string, variant?: string): THREE.Texture;
export function shaftTexture(): THREE.Texture;
export function flareSource(profile: string, position: THREE.Vector3, opts?: Record<string, unknown>): LightZone;

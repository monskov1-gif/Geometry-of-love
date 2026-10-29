// Types for the vendored window-light.js (exposure + lens flares near bright lights).
import type * as THREE from 'three';

export interface LookRenderer {
  setLayer(name: string, values: Record<string, number>): void;
  clearLayer(name: string): void;
}

export class LookLayers implements LookRenderer {
  constructor(gl: THREE.WebGLRenderer, opts?: { bloomPass?: unknown; exposure?: number; bloom?: number });
  setLayer(name: string, values: Record<string, number>): void;
  clearLayer(name: string): void;
  apply(): void;
}

export class WindowLight {
  constructor(opts: { renderer: LookRenderer; canvas: HTMLCanvasElement; low?: boolean; settings?: unknown });
  readonly canvas: HTMLCanvasElement;
  update(dt: number, ctx: { world: { windowLights: unknown[] }; player: { position: THREE.Vector3 } | null; camera: THREE.Camera }): void;
  dispose?(): void;
}

// Floating file panels of the system partition: old-OS windows drawn in green
// on near-black — a title bar with the file name, rows of code, a size line.
// Each panel is a thin box (a frame with depth) with its face on a lit plane
// 2 mm in front, so it never z-fights and never reads as a flat strip.
import * as THREE from 'three';
import { rng, TX, type LocationKit } from '../kit/location-kit';
import { pixelText } from '../candy/shapes';
import { CODE_CORRUPT, CODE_DEEP } from './glyphs';

export interface PanelSpec {
  name: string;
  x: number;
  y: number;
  z: number;
  w: number;
  ry?: number;
  rz?: number;
  /** 'user' panels list an owner; 'system' ones are world components. */
  kind?: 'user' | 'system';
  /** Damaged file: corruption-red title, missing rows (shown in the 'glitch' state). */
  broken?: boolean;
  seed?: number;
}

export const panelTex = (p: PanelSpec, damaged: boolean) =>
  TX(`panel-${p.name}-${damaged ? 'd' : 'ok'}`, 128, 88, (ctx, w, h) => {
    const r = rng(p.seed ?? p.name.length * 31);
    const ink = damaged ? '#f04b67' : '#39ff88';
    const dim = damaged ? '#5a1a24' : '#145a34';
    ctx.fillStyle = '#060c08';
    ctx.fillRect(0, 0, w, h);
    // frame + title bar
    ctx.fillStyle = dim;
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, h - 1, w, 1);
    ctx.fillRect(0, 0, 1, h);
    ctx.fillRect(w - 1, 0, 1, h);
    ctx.fillStyle = damaged ? '#3a0e16' : '#0e3a22';
    ctx.fillRect(1, 1, w - 2, 11);
    pixelText(ctx, p.name, 4, 1, 9, ink, { font: 'monospace' });
    // window buttons
    ctx.fillStyle = ink;
    for (let i = 0; i < 3; i++) ctx.fillRect(w - 10 - i * 6, 4, 4, 4);
    // rows of code: indented bars and a few glyph words
    let y = 16;
    while (y < h - 16) {
      const indent = 4 + Math.floor(r() * 3) * 6;
      if (damaged && r() < 0.35) {
        // a hole where the data was
        ctx.fillStyle = '#1a0a0e';
        ctx.fillRect(indent, y, 30 + r() * 60, 4);
      } else if (r() < 0.25) {
        pixelText(ctx, ['fn', 'if', 'ret', 'let', 'map', 'ptr', 'obj'][Math.floor(r() * 7)]!, indent, y - 3, 8, ink, { font: 'monospace', bold: false });
        ctx.fillStyle = dim;
        ctx.fillRect(indent + 20, y, 20 + r() * 50, 3);
      } else {
        ctx.fillStyle = r() < 0.2 ? ink : dim;
        ctx.fillRect(indent, y, 12 + r() * 70, 3);
        if (r() < 0.5) ctx.fillRect(indent + 90, y, 8 + r() * 20, 3);
      }
      y += 6;
    }
    // footer: owner / size
    ctx.fillStyle = damaged ? '#3a0e16' : '#0b2a18';
    ctx.fillRect(1, h - 13, w - 2, 12);
    pixelText(ctx, p.kind === 'user' ? 'OWNER: ' + (damaged ? '????' : p.name.split('.')[0]!.toUpperCase()) : 'SYSTEM  ' + (8 + Math.floor(r() * 90)) + 'KB', 4, h - 13, 8, ink, { font: 'monospace', bold: false });
  });

export interface PanelHandle {
  spec: PanelSpec;
  face: THREE.Mesh;
  ok: THREE.MeshBasicMaterial;
  bad: THREE.MeshBasicMaterial | null;
  /** Thread anchor: the middle of the panel's lower edge (world). */
  anchor: THREE.Vector3;
}

/**
 * Builds a panel: a dark frame box batched in the kit (static) and a separate
 * face mesh (it swaps to the damaged texture in the 'glitch' state).
 */
export function filePanel(kit: LocationKit, root: THREE.Object3D, p: PanelSpec, frameMat: THREE.Material): PanelHandle {
  const h = (p.w * 88) / 128;
  const rot = new THREE.Euler(0, p.ry ?? 0, p.rz ?? 0);
  kit.rb(p.w + 0.06, h + 0.06, 0.05, 0.012, frameMat, p.x, p.y, p.z, { rx: rot.x, ry: rot.y, rz: rot.z });
  const ok = new THREE.MeshBasicMaterial({ map: panelTex(p, false), toneMapped: false });
  const bad = p.broken ? new THREE.MeshBasicMaterial({ map: panelTex(p, true), toneMapped: false }) : null;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(p.w, h), ok);
  const q = new THREE.Quaternion().setFromEuler(rot);
  face.quaternion.copy(q);
  face.position.set(p.x, p.y, p.z).add(new THREE.Vector3(0, 0, 0.027).applyQuaternion(q));
  root.add(face);
  const anchor = new THREE.Vector3(0, -h / 2 - 0.03, 0).applyQuaternion(q).add(new THREE.Vector3(p.x, p.y, p.z));
  return { spec: p, face, ok, bad, anchor };
}

/** Panel colours for the static frame material (kept here so both locations match). */
export const PANEL_FRAME = 0x0c1a12;
export const PANEL_EDGE = CODE_DEEP;
export const CORRUPT = CODE_CORRUPT;

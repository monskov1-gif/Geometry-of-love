// The candy builder context: four vertex-coloured batches (matte, glossy toys,
// alphabet-block atlas, sticker atlas) on top of a LocationKit. A candy
// location builds everything through it and calls `flushCandy` once, next to
// the kit's own flushBatches().
import * as THREE from 'three';
import { rng, type LocationKit } from '../kit/location-kit';
import { blockAtlas, BLOCK_COLS, BLOCK_ROWS, stickerAtlas, STICKER_COLS, STICKER_ROWS } from './atlases';
import { CandyBatch } from './batch';

export interface CandyKit {
  kit: LocationKit;
  /** Matte painted things: walls trims, furniture, clouds, flags. */
  vc: CandyBatch;
  /** Glossy plastic toys. */
  gloss: CandyBatch;
  /** Alphabet blocks (block atlas). */
  blocks: CandyBatch;
  /** Die-cut stickers (sticker atlas, cut out by alpha). */
  stickers: CandyBatch;
  /** Stickers that only appear in the later phases ('glitch' state): eyes, wrong smiles. */
  lateStickers: CandyBatch;
  r: () => number;
}

export function candyKit(kit: LocationKit, seed: number): CandyKit {
  return {
    kit,
    vc: new CandyBatch(kit),
    gloss: new CandyBatch(kit),
    blocks: new CandyBatch(kit, { cols: BLOCK_COLS, rows: BLOCK_ROWS }),
    stickers: new CandyBatch(kit, { cols: STICKER_COLS, rows: STICKER_ROWS }),
    lateStickers: new CandyBatch(kit, { cols: STICKER_COLS, rows: STICKER_ROWS }),
    r: rng(seed),
  };
}

export function flushCandy(ck: CandyKit, root: THREE.Object3D): void {
  const { kit } = ck;
  ck.vc.flush(root, kit.mat('candyMatte', { vertexColors: true, color: 0xffffff, roughness: 0.75, toneMapped: false }));
  ck.gloss.flush(root, kit.mat('candyGloss', { vertexColors: true, color: 0xffffff, roughness: 0.22, metalness: 0.05, emissive: 0x140c18, toneMapped: false }));
  ck.blocks.flush(root, kit.mat('candyBlocks', { vertexColors: true, color: 0xffffff, map: blockAtlas(), roughness: 0.5, toneMapped: false }));
  const stickerMat = kit.mat('candyStickers', { vertexColors: true, color: 0xffffff, map: stickerAtlas(), alphaTest: 0.5, roughness: 0.6, toneMapped: false });
  ck.stickers.flush(root, stickerMat);
  const late = ck.lateStickers.flush(root, stickerMat);
  if (late) kit.onState((s) => (late.visible = s === 'glitch'));
}

export const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)]!;

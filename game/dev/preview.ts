// Dev-only preview: /preview.html?loc=<id> renders every lighting state of a
// location (plus its animated layer at t=0); ?sprites=1 renders sprite sheets.
// Not part of the production build (vite builds index.html only).
import { Painter, VIEW_H, VIEW_W } from '../src/render/painter';
import { locations } from '../src/render/locations';

const out = document.getElementById('out')!;
const params = new URLSearchParams(location.search);
const ids = params.get('loc') ? [params.get('loc')!] : Object.keys(locations);
const variant = params.get('variant') ?? undefined;
for (const id of ids) {
  const loc = locations[id]!;
  for (const light of loc.lightings) {
    const c = document.createElement('canvas');
    c.width = VIEW_W;
    c.height = VIEW_H;
    const pt = new Painter(c);
    loc.paint(pt, light, variant);
    if (loc.animate) {
      const fx = document.createElement('canvas');
      fx.width = VIEW_W;
      fx.height = VIEW_H;
      loc.animate(new Painter(fx), 1000, light, variant);
      pt.ctx.drawImage(fx, 0, 0);
    }
    const wrap = document.createElement('div');
    wrap.append(`${id} · ${light}`, c);
    out.append(wrap);
  }
}
document.body.dataset.ready = '1';

// ?sprites=1 — every character: emotions (front), talking, walk cycle (side).
import { EMOTIONS, spriteFrame, spriteIds, type Frame } from '../src/render/sprites';
if (params.get('sprites')) {
  out.replaceChildren();
  out.style.display = 'block';
  const scale = Number(params.get('scale') ?? 5);
  for (const id of spriteIds) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:flex-end;margin:6px;background:#cfc9bd;padding:6px';
    row.append(id);
    const frames: Frame[] = [
      ...EMOTIONS.map((emotion) => ({ facing: 'front' as const, emotion, walk: -1, breath: 0 as const, mouthOpen: false })),
      { facing: 'front', emotion: 'neutral', walk: -1, breath: 1, mouthOpen: true },
      ...[0, 1, 2, 3].map((walk) => ({ facing: 'side' as const, emotion: 'neutral' as const, walk, breath: 0 as const, mouthOpen: false })),
    ];
    for (const f of frames) {
      const src = spriteFrame(id, f);
      const c = document.createElement('canvas');
      c.width = src.width * scale;
      c.height = src.height * scale;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, c.width, c.height);
      c.style.cssText = `width:${c.width}px;height:${c.height}px`;
      row.append(c);
    }
    out.append(row);
  }
}

// ?logo=2.5,4,6,7,10 — frames of the opening logo at those seconds.
import { drawLogo, LOGO_H, LOGO_W } from '../src/render/logo';
if (params.get('logo')) {
  out.replaceChildren();
  for (const t of params.get('logo')!.split(',').map(Number)) {
    const c = document.createElement('canvas');
    c.width = LOGO_W;
    c.height = LOGO_H;
    drawLogo(new Painter(c), t);
    const wrap = document.createElement('div');
    wrap.append(`logo t=${t}`, c);
    out.append(wrap);
  }
}

// ?monster=1&scale=3 — Melody the monster: rise poses, crawl cycle, head tilts.
import { CRAWL_FRAMES, drawMonster, loadMonsterSheet, MONSTER_H, MONSTER_W, type MonsterPose } from '../src/render/sprites/monster-sheet';
if (params.get('monster')) {
  out.replaceChildren();
  out.style.display = 'block';
  out.style.background = '#6a7890';
  const scale = Number(params.get('scale') ?? 3);
  const row = (poses: [MonsterPose, number][]) => {
    const r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:8px;margin:8px;flex-wrap:wrap';
    for (const [pose, tilt] of poses) {
      const src = document.createElement('canvas');
      src.width = MONSTER_W;
      src.height = MONSTER_H;
      drawMonster(src.getContext('2d')!, pose, tilt);
      const c = document.createElement('canvas');
      c.width = src.width * scale;
      c.height = src.height * scale;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, c.width, c.height);
      r.append(c);
    }
    out.append(r);
  };
  void loadMonsterSheet().then(() => {
    row([['rise', 0], ['lunge', 0], ['reach', 0]]);
    row(CRAWL_FRAMES.map((f) => [f, 0] as [MonsterPose, number]));
    row([['crawl1', -0.55], ['crawl2', 0.5], ['reach', 0.6]]);
  });
}

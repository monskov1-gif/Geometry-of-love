"""Turns the author's monster sheet (materials/references/chase/melody-monster-sheet.jpg)
into clean pixel sprites for the chase and the transformation cutscene.

The sheet is soft, JPEG-compressed pseudo pixel art without a consistent grid, so
each figure is cut out, its black background removed by a flood fill from the
borders (the black eyes and mouth are enclosed and stay), resampled onto a pixel
grid (median colour per block), snapped to one shared palette and outlined.

Output: game/src/assets/characters/melody-monster/{monster.png, monster.json}.
Run: python3 -I scripts/extract-monster.py   (needs Pillow + numpy; dev only)
"""
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'materials/references/chase/melody-monster-sheet.jpg'
OUT = ROOT / 'game/src/assets/characters/melody-monster'

# name: (x0, y0, x1, y1, source pixels per sprite pixel)
FIGURES = {
    'head': (24, 160, 190, 382, 3.0),
    'rise': (134, 140, 500, 520, 3.0),
    'lunge': (478, 166, 1004, 524, 3.0),
    'reach': (922, 184, 1516, 532, 3.0),
    'crawl0': (12, 640, 292, 836, 1.5),
    'crawl1': (316, 638, 602, 836, 1.5),
    'crawl2': (612, 640, 900, 832, 1.5),
    'crawl3': (906, 638, 1172, 844, 1.5),
    'crawl4': (1218, 640, 1512, 840, 1.5),
}
PALETTE_SIZE = 26
# accents a small k-means would wash out: clip triangle, clip ring, bow blue/green, void black
KEY_COLOURS = [(226, 40, 52), (240, 196, 60), (58, 52, 224), (70, 200, 96), (8, 4, 10)]
BG_MAX = 22
# head of the «reach» sprite (sprite pixels): ellipse with the bow, and the neck it turns on
HEAD_CENTRE, HEAD_RADII, HEAD_PIVOT = (128, 38), (34, 41), (112, 64)
# frames whose head hangs lower than the bow suggests (checked by eye on the preview)
HEAD_NUDGE = {'crawl0': (2, 7)}  # a source pixel this dark (every channel) touching the border is background


def background(a: np.ndarray) -> np.ndarray:
    dark = a.max(axis=2) < BG_MAX
    h, w = dark.shape
    bg = np.zeros_like(dark)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and dark[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    return bg


def resample(a: np.ndarray, bg: np.ndarray, s: float):
    h, w = bg.shape
    ow, oh = int(w / s), int(h / s)
    col = np.zeros((oh, ow, 3))
    solid = np.zeros((oh, ow), bool)
    for oy in range(oh):
        y0, y1 = int(oy * s), max(int(oy * s) + 1, int((oy + 1) * s))
        for ox in range(ow):
            x0, x1 = int(ox * s), max(int(ox * s) + 1, int((ox + 1) * s))
            m = ~bg[y0:y1, x0:x1]
            if m.mean() < 0.5:
                continue
            solid[oy, ox] = True
            # the block's centre colour when it is part of the figure (crisper than a mean), else the median
            cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
            col[oy, ox] = a[cy, cx] if not bg[cy, cx] else np.median(a[y0:y1, x0:x1][m], axis=0)
    return col, solid


def bow_anchor(rgba: np.ndarray, pal: np.ndarray):
    """The bow's top-right corner: the steadiest landmark of the head in every frame."""
    c = rgba[:, :, :3].astype(int)
    blue = (c[:, :, 2] > 150) & (c[:, :, 0] < 120) & (rgba[:, :, 3] > 0)
    green = (c[:, :, 1] > 150) & (c[:, :, 0] < 120) & (c[:, :, 2] < 150) & (rgba[:, :, 3] > 0)
    ys, xs = np.nonzero(blue | green)
    if not len(xs):
        raise SystemExit('bow not found')
    return xs.max(), ys.min()


def largest_parts(solid: np.ndarray) -> np.ndarray:
    """Keeps the figure: 8-connected parts at least 4% of the biggest (drops bits of neighbours)."""
    h, w = solid.shape
    lab = np.full((h, w), -1)
    sizes = []
    for sy, sx in zip(*np.nonzero(solid)):
        if lab[sy, sx] >= 0:
            continue
        i = len(sizes)
        lab[sy, sx] = i
        q, n = deque([(sy, sx)]), 0
        while q:
            y, x = q.popleft()
            n += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and lab[ny, nx] < 0:
                        lab[ny, nx] = i
                        q.append((ny, nx))
        sizes.append(n)
    big = max(sizes)
    main = sizes.index(big)
    # parts cut by the crop's left/right edge belong to the neighbouring figure
    cut = set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    keep = [i for i, n in enumerate(sizes) if i == main or (n >= big * 0.04 and i not in cut)]
    return np.isin(lab, keep)


def kmeans(px: np.ndarray, k: int) -> np.ndarray:
    rng = np.random.default_rng(7)
    # k-means++ seeding, then Lloyd iterations
    c = [px[rng.integers(len(px))]]
    for _ in range(k - 1):
        d = np.min(((px[:, None] - np.array(c)[None]) ** 2).sum(2), axis=1)
        c.append(px[rng.choice(len(px), p=d / d.sum())])
    c = np.array(c)
    for _ in range(30):
        lab = ((px[:, None] - c[None]) ** 2).sum(2).argmin(1)
        for i in range(k):
            if (lab == i).any():
                c[i] = px[lab == i].mean(0)
    return np.round(c).astype(int)


def main() -> int:
    if not SRC.exists():
        print(f'missing {SRC}', file=sys.stderr)
        return 1
    sheet = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    figs = {}
    for name, (x0, y0, x1, y1, s) in FIGURES.items():
        a = sheet[y0:y1, x0:x1]
        col, solid = resample(a, background(a), s)
        figs[name] = (col, largest_parts(solid))
    allpx = np.concatenate([col[solid] for col, solid in figs.values()])
    pal = np.concatenate([kmeans(allpx, PALETTE_SIZE), np.array(KEY_COLOURS)])
    lum = pal @ np.array([0.3, 0.59, 0.11])
    outline = pal[lum.argmin()]

    sprites = {}
    for name, (col, solid) in figs.items():
        h, w = solid.shape
        idx = ((col[:, :, None] - pal[None, None]) ** 2).sum(3).argmin(2)
        rgba = np.zeros((h, w, 4), np.uint8)
        rgba[solid, :3] = pal[idx[solid]]
        rgba[solid, 3] = 255
        # drop specks: opaque pixels with fewer than two opaque neighbours
        n = np.zeros((h, w), int)
        pad = np.pad(solid, 1)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    n += pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        keep = solid & (n >= 2)
        rgba[~keep] = 0
        # 1px dark outline around the silhouette so it reads on any background
        pad = np.pad(keep, 1)
        edge = np.zeros((h, w), bool)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            edge |= pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        edge &= ~keep
        rgba[edge, :3] = outline
        rgba[edge, 3] = 255
        ys, xs = np.nonzero(rgba[:, :, 3])
        sprites[name] = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

    # the crisp head of the «reach» pose, cut on an ellipse with its bow; it is drawn
    # over every crawl frame (whose heads are soft) and can turn on its own (гл. 14)
    r = sprites['reach']
    yy, xx = np.mgrid[0:r.shape[0], 0:r.shape[1]]
    hx, hy = HEAD_CENTRE
    inside = ((xx - hx) / HEAD_RADII[0]) ** 2 + ((yy - hy) / HEAD_RADII[1]) ** 2 <= 1
    part = np.where(inside[:, :, None], r, 0).astype(np.uint8)
    ys, xs = np.nonzero(part[:, :, 3])
    hx0, hy0 = xs.min(), ys.min()
    sprites['headpart'] = part[hy0:ys.max() + 1, hx0:xs.max() + 1]
    ref = bow_anchor(r, pal)
    heads = {}
    for name in [n for n in sprites if n.startswith('crawl')] + ['reach']:
        a = bow_anchor(sprites[name], pal)
        nx, ny = HEAD_NUDGE.get(name, (0, 0))
        heads[name] = {'x': int(hx0 + a[0] - ref[0] + nx), 'y': int(hy0 + a[1] - ref[1] + ny)}

    # one row per figure, packed top to bottom
    W = max(s.shape[1] for s in sprites.values())
    H = sum(s.shape[0] + 1 for s in sprites.values())
    atlas = np.zeros((H, W, 4), np.uint8)
    rects, y = {}, 0
    for name, s in sprites.items():
        h, w = s.shape[:2]
        atlas[y:y + h, :w] = s
        rects[name] = {'x': 0, 'y': y, 'w': w, 'h': h}
        y += h + 1
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(atlas, 'RGBA').save(OUT / 'monster.png', optimize=True)
    pivot = {'x': int(HEAD_PIVOT[0] - hx0), 'y': int(HEAD_PIVOT[1] - hy0)}
    (OUT / 'monster.json').write_text(json.dumps({'source': SRC.name, 'frames': rects, 'heads': heads, 'headPivot': pivot}, indent=1) + '\n')
    print(f'{len(rects)} sprites, atlas {W}x{H}, palette {len(pal)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

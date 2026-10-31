// SVG view of the file graph in «Системные файлы»: wires as tangled curves
// with direction arrows and wide invisible hit areas (fingers), file boxes
// that are focusable buttons, marks, locks and the traced path.
import type { Stage, StageNode } from './files-stages';
import { label, VIEW } from './files-stages';
import { fileIcon, filesBackdrop, lockIcon } from './files-art';

export interface GraphState {
  selectedNode: string | null;
  selectedLink: string | null;
  cut: ReadonlySet<string>;
  tags: ReadonlySet<string>;
  locked: string | null;
  relinked: string | null;
  traced: readonly string[];
}

export interface GraphHandlers {
  node(id: string): void;
  link(id: string): void;
}

const SVG = 'http://www.w3.org/2000/svg';
export const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

const BOX = { w: 27, h: 10 };
const COLORS = { muted: 'var(--code-green-muted)', on: 'var(--code-green)', cut: 'var(--code-corruption)', warn: 'var(--code-warning)' };

let art: { backdrop: string; icons: Record<string, string>; lock: string } | null = null;
const getArt = () =>
  (art ??= {
    backdrop: filesBackdrop(),
    icons: Object.fromEntries((['system', 'user', 'damaged', 'link'] as const).map((k) => [k, fileIcon(k)])),
    lock: lockIcon(),
  });

const image = (href: string, x: number, y: number, w: number, h: number) =>
  svgEl('image', { href, x, y, width: w, height: h, preserveAspectRatio: 'none', style: 'image-rendering: pixelated', 'pointer-events': 'none' });

/** A curve from the box of `a` to the box of `b`, bent sideways by `bend` so wires cross like a tangle. */
function wire(a: StageNode, b: StageNode, bend: number): { d: string; tip: [number, number, number] } {
  const same = Math.abs(a.y - b.y) < 1;
  const dir = b.y < a.y ? -1 : 1;
  const x1 = same ? a.x + Math.sign(b.x - a.x) * (BOX.w / 2) : a.x + bend * 0.25;
  const y1 = same ? a.y : a.y + (dir * BOX.h) / 2;
  const x2 = same ? b.x - Math.sign(b.x - a.x) * (BOX.w / 2) : b.x - bend * 0.25;
  const y2 = same ? b.y : b.y - (dir * BOX.h) / 2;
  const c1: [number, number] = same ? [x1 + (x2 - x1) / 3, y1 - 9 - bend] : [x1 + bend, y1 + dir * 12];
  const c2: [number, number] = same ? [x2 - (x2 - x1) / 3, y2 - 9 - bend] : [x2 - bend, y2 - dir * 12];
  // arrow tip at 72% of the curve, pointing along it
  const t = 0.72;
  const p = (i: 0 | 1) => (1 - t) ** 3 * [x1, y1][i]! + 3 * (1 - t) ** 2 * t * c1[i] + 3 * (1 - t) * t * t * c2[i] + t ** 3 * [x2, y2][i]!;
  const q = (i: 0 | 1) => 3 * (1 - t) ** 2 * (c1[i] - [x1, y1][i]!) + 6 * (1 - t) * t * (c2[i] - c1[i]) + 3 * t * t * ([x2, y2][i]! - c2[i]);
  return { d: `M${x1} ${y1} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${x2} ${y2}`, tip: [p(0), p(1), (Math.atan2(q(1), q(0)) * 180) / Math.PI] };
}

export function renderGraph(svg: SVGSVGElement, stage: Stage, s: GraphState, on: GraphHandlers, scan: SVGElement): void {
  const { backdrop, icons, lock } = getArt();
  svg.replaceChildren(image(backdrop, -50, 0, 220, 100));
  const byId = (id: string) => stage.nodes.find((n) => n.id === id)!;
  stage.links.forEach((l, i) => {
    const a = byId(l.from);
    const b = byId(l.to);
    const { d, tip } = wire(a, b, ((i * 7) % 11) - 5);
    const cut = s.cut.has(l.id);
    const traced = s.traced.includes(l.id);
    const active = s.selectedLink === l.id || (!!s.selectedNode && (l.from === s.selectedNode || l.to === s.selectedNode));
    const colour = traced || s.relinked === l.id ? COLORS.warn : cut ? COLORS.cut : active ? COLORS.on : COLORS.muted;
    const g = svgEl('g', { 'data-link': l.id });
    g.append(
      svgEl('path', {
        d,
        class: `files-link${cut ? ' is-cut' : ''}${active ? ' is-active' : ''}`,
        style: `fill:none;stroke:${colour};stroke-width:${traced || s.selectedLink === l.id ? 1.1 : active ? 0.8 : 0.5}`,
      }),
    );
    if (!cut) g.append(svgEl('path', { d: 'M-1.4 -1.1 L1.2 0 L-1.4 1.1 Z', transform: `translate(${tip[0]} ${tip[1]}) rotate(${tip[2]})`, style: `fill:${colour}` }));
    const hit = svgEl('path', { d, style: 'fill:none;stroke:transparent;stroke-width:5;cursor:pointer', 'pointer-events': 'stroke' });
    hit.addEventListener('click', () => on.link(l.id));
    g.append(hit);
    svg.append(g);
  });
  for (const n of stage.nodes) {
    const selected = s.selectedNode === n.id;
    const tagged = s.tags.has(n.id);
    const locked = s.locked === n.id;
    const g = svgEl('g', {
      class: `files-node kind-${n.kind}${selected ? ' is-selected' : ''}`,
      tabindex: 0,
      role: 'button',
      'aria-label': `${label(n.id)}${tagged ? ', помечен' : ''}${locked ? ', заперт' : ''}`,
      'aria-pressed': String(selected),
      'data-node': n.id,
      'data-focus': `node-${n.id}`,
    });
    const stroke = locked ? COLORS.cut : tagged ? COLORS.on : '';
    g.append(
      svgEl('rect', {
        x: n.x - BOX.w / 2,
        y: n.y - BOX.h / 2,
        width: BOX.w,
        height: BOX.h,
        rx: 1,
        style: stroke ? `stroke:${stroke};stroke-width:1;${tagged ? 'fill:var(--code-grid)' : ''}` : '',
      }),
    );
    g.append(image(icons[n.kind]!, n.x - BOX.w / 2 + 0.8, n.y - 2.5, 3, 5));
    const t = svgEl('text', { x: n.x + 1.8, y: n.y + 1.3, 'text-anchor': 'middle' });
    t.textContent = label(n.id);
    g.append(t);
    if (tagged) g.append(svgEl('rect', { x: n.x + BOX.w / 2 - 3, y: n.y - BOX.h / 2 - 1.5, width: 3, height: 3, style: `fill:${COLORS.on}` }));
    if (locked) g.append(image(lock, n.x + BOX.w / 2 - 4, n.y - BOX.h / 2 - 3.5, 4.8, 5));
    g.addEventListener('click', () => on.node(n.id));
    g.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key;
      if (key !== 'Enter' && key !== ' ') return;
      e.preventDefault();
      on.node(n.id);
    });
    svg.append(g);
  }
  svg.append(scan);
}

export const graphSvg = () =>
  svgEl('svg', { viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, class: 'files-graph', role: 'group', 'aria-label': 'Граф файлов' }) as SVGSVGElement;

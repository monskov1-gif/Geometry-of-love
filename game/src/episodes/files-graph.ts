// Pure rules of the file graph in «Системные файлы» (chapter 13), no DOM.
// A link `from → to` means "file `from` hangs on file `to`". Dameo's file is
// user_07; the erased users' files (user_01…06, kind 'damaged') still hold
// parts of the world, so no link they rely on may be cut.
//   * Dameo's files ("owned"): reachable from user_07 and from no erased user.
//   * Dameo's links: links that start in one of his files. Only these may be cut.
//   * Order rule: a link A → B can be cut only after every link of Dameo's
//     that hangs on A (C → A) is already cut — the files depending on it are freed.

export type FileKind = 'system' | 'user' | 'damaged' | 'link';

export interface GraphNode {
  id: string;
  kind: FileKind;
}

export interface GraphLink {
  id: string;
  from: string;
  to: string;
}

export interface Graph {
  nodes: readonly GraphNode[];
  links: readonly GraphLink[];
}

export const DAMEO = 'u07';
export const WORLD = 'world';

const kindOf = (g: Graph, id: string) => g.nodes.find((n) => n.id === id)?.kind;

/** Nodes reachable from `start` over links not in `cut`. */
export function reachable(g: Graph, start: string, cut: ReadonlySet<string> = new Set()): Set<string> {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const at = queue.shift()!;
    for (const l of g.links) {
      if (l.from !== at || cut.has(l.id) || seen.has(l.to)) continue;
      seen.add(l.to);
      queue.push(l.to);
    }
  }
  return seen;
}

/** Erased users whose files reach `nodeId` (over the full, uncut graph). */
export function holders(g: Graph, nodeId: string): string[] {
  return g.nodes.filter((n) => n.kind === 'damaged' && reachable(g, n.id).has(nodeId)).map((n) => n.id);
}

/** Dameo's files: user_07 plus link files reachable from it and from no erased user. */
export function ownedFiles(g: Graph): Set<string> {
  const mine = reachable(g, DAMEO);
  return new Set([...mine].filter((id) => id === DAMEO || (kindOf(g, id) === 'link' && holders(g, id).length === 0)));
}

/** The link files the player has to find in stage 1 (Dameo's files without user_07 itself). */
export function ownedLinkFiles(g: Graph): Set<string> {
  const owned = ownedFiles(g);
  owned.delete(DAMEO);
  return owned;
}

export function dameoLinks(g: Graph): GraphLink[] {
  const owned = ownedFiles(g);
  return g.links.filter((l) => owned.has(l.from));
}

export type CutCheck =
  | { result: 'ok' }
  /** not Dameo's link: cutting it would erase an erased user's file or the world itself */
  | { result: 'wrong'; victims: string[] }
  /** Dameo's link, but a file of his still hangs on its start */
  | { result: 'blocked'; waitingFor: string[] };

export function checkCut(g: Graph, cut: ReadonlySet<string>, linkId: string, orderRule: boolean): CutCheck {
  const link = g.links.find((l) => l.id === linkId);
  if (!link) throw new Error(`system-files: unknown link ${linkId}`);
  const owned = ownedFiles(g);
  if (!owned.has(link.from)) {
    const victims = holders(g, link.from);
    return { result: 'wrong', victims: victims.length ? victims : [link.from] };
  }
  if (orderRule) {
    const waiting = g.links.filter((l) => l.to === link.from && owned.has(l.from) && !cut.has(l.id)).map((l) => l.from);
    if (waiting.length) return { result: 'blocked', waitingFor: waiting };
  }
  return { result: 'ok' };
}

/** Link ids of one path user_07 → `to` over uncut links, or null when there is none. */
export function findPath(g: Graph, cut: ReadonlySet<string>, to = WORLD, from = DAMEO): string[] | null {
  const via = new Map<string, GraphLink>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    if (at === to) break;
    for (const l of g.links) {
      if (l.from !== at || cut.has(l.id) || seen.has(l.to)) continue;
      seen.add(l.to);
      via.set(l.to, l);
      queue.push(l.to);
    }
  }
  if (!seen.has(to)) return null;
  const path: string[] = [];
  for (let at = to; at !== from; ) {
    const l = via.get(at)!;
    path.unshift(l.id);
    at = l.from;
  }
  return path;
}

/** Every one of Dameo's links is cut (stages 2 and 3). */
export const allDameoLinksCut = (g: Graph, cut: ReadonlySet<string>) => dameoLinks(g).every((l) => cut.has(l.id));

/** Solver for the order stages: a full valid cut sequence, or null if none exists. */
export function solveOrder(g: Graph): string[] | null {
  const cut = new Set<string>();
  const todo = dameoLinks(g);
  while (cut.size < todo.length) {
    const next = todo.find((l) => !cut.has(l.id) && checkCut(g, cut, l.id, true).result === 'ok');
    if (!next) return null;
    cut.add(next.id);
  }
  return [...cut];
}

/** Solver for the final stage: the smallest set of Dameo's links (≤ budget) that leaves no path to world.map. */
export function solveSeparate(g: Graph, budget: number): string[] | null {
  const ids = dameoLinks(g).map((l) => l.id);
  const pick = (start: number, chosen: string[], size: number): string[] | null => {
    if (chosen.length === size) return findPath(g, new Set(chosen)) ? null : chosen;
    for (let i = start; i < ids.length; i++) {
      const found = pick(i + 1, [...chosen, ids[i]!], size);
      if (found) return found;
    }
    return null;
  };
  for (let size = 1; size <= budget; size++) {
    const found = pick(0, [], size);
    if (found) return found;
  }
  return null;
}

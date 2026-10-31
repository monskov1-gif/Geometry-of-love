// Stage 3 of «Системные файлы»: the program locks one of Dameo's files and
// the Calculator gives the unlock digits as small sums — one digit per example.
// Pure: tests check every lock can be opened well within its time.

export interface Lock {
  node: string;
  /** Examples shown by the Calculator, e.g. "3 + 4"; each answer is one digit. */
  problems: string[];
  answer: string;
  typed: string;
  /** Seconds left before the program restores every link. */
  left: number;
  limit: number;
}

/** Seconds given for a lock of `length` digits: generous for one example at a time. */
export const lockTime = (length: number) => 8 + 4 * length;

const pick = (rand: () => number, n: number) => Math.floor(rand() * n);

/** One example with a single-digit answer `d`. */
export function example(d: number, rand: () => number): string {
  const kind = pick(rand, 3);
  if (kind === 0) {
    const a = pick(rand, d + 1);
    return `${a} + ${d - a}`;
  }
  if (kind === 1 || d === 0) {
    const a = d + pick(rand, 10 - d);
    return `${a} − ${a - d}`;
  }
  const pairs: [number, number][] = [];
  for (let a = 1; a <= d; a++) if (d % a === 0) pairs.push([a, d / a]);
  const [a, b] = pairs[pick(rand, pairs.length)]!;
  return `${a} × ${b}`;
}

export function makeLock(node: string, length: number, rand: () => number): Lock {
  const digits = Array.from({ length }, () => pick(rand, 10));
  const limit = lockTime(length);
  return { node, problems: digits.map((d) => example(d, rand)), answer: digits.join(''), typed: '', left: limit, limit };
}

/** Evaluates an example string (used by tests and the e2e helper's logic). */
export function solveExample(text: string): number {
  const m = /^(\d+) ([+−×]) (\d+)$/.exec(text);
  if (!m) throw new Error(`system-files: bad example ${text}`);
  const a = Number(m[1]);
  const b = Number(m[3]);
  return m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b;
}

// Melody's pop-up notifications on the CRT (гл. 3: «в углу экрана появляется
// уведомление… одно над другим, пока не заполняют весь правый край экрана»).
// Each pop-up is a small window of the 2004 program: a pink title bar with her
// portrait as the icon, the message in the body. New ones slide in from the
// right edge, push the column up and blink their title bar for a moment; with
// reduced motion they simply appear.

/** Drawing helpers the notices need from the screen. */
export interface NoticePainter {
  ctx: CanvasRenderingContext2D;
  /** Melody's portrait fitted (whole frame, proportions kept) into a box. */
  icon(x: number, y: number, size: number): void;
}

const W = 140;
const H = 32;
const GAP = 3;
const RIGHT = 6;
/** Bottom of the column: above the taskbar. */
const BOTTOM = 240 - 18;
const SLIDE = 0.35;
const STAGGER = 0.45;
const BLINK = 2.4;

const INK = '#30243b';
const HOT = '#ff6cc5';
const PINK = '#ffc9f6';
const PAPER = '#fff9fd';

interface Notice {
  text: string;
  /** Screen time it appears at (later ones wait their turn). */
  born: number;
  /** Animated top edge; follows the column. */
  y: number | null;
}

export class NoticeColumn {
  private list: Notice[] = [];
  private now = 0;

  /** True while something moves (the screen redraws faster then). */
  get animating(): boolean {
    return this.list.some((n) => this.now - n.born < BLINK);
  }

  /** Matches the stack to the story; new texts at the end slide in one after another. */
  set(texts: readonly string[], calm: boolean): void {
    const keep = this.list.length <= texts.length && this.list.every((n, i) => n.text === texts[i]);
    if (!keep) this.list = [];
    let next = Math.max(this.now, ...this.list.map((n) => n.born + STAGGER));
    for (let i = this.list.length; i < texts.length; i++) {
      // calm (reduced motion): no slide, no blink
      const born = calm ? this.now - BLINK : next;
      this.list.push({ text: texts[i]!, born, y: null });
      next = born + STAGGER;
    }
  }

  draw(p: NoticePainter, t: number, calm: boolean): void {
    this.now = t;
    const visible = this.list.filter((n) => t >= n.born);
    const c = p.ctx;
    visible.forEach((n, i) => {
      const rank = visible.length - 1 - i; // 0 = newest, at the bottom
      const target = BOTTOM - (rank + 1) * (H + GAP);
      n.y = n.y === null || calm ? target : n.y + (target - n.y) * 0.5;
      if (Math.abs(n.y - target) < 0.5) n.y = target;
      const y = Math.round(n.y);
      if (y < -H) return;
      const age = t - n.born;
      const k = calm ? 1 : Math.min(1, age / SLIDE);
      const x = Math.round(320 - RIGHT - W + (1 - k * (2 - k)) * (W + RIGHT + 4));
      const blink = !calm && rank === 0 && age < BLINK && Math.floor(age * 3) % 2 === 1;
      // shadow, frame, title bar
      c.fillStyle = 'rgba(20,10,30,0.45)';
      c.fillRect(x + 2, y + 2, W, H);
      c.fillStyle = INK;
      c.fillRect(x - 1, y - 1, W + 2, H + 2);
      c.fillStyle = PAPER;
      c.fillRect(x, y, W, H);
      c.fillStyle = blink ? PINK : HOT;
      c.fillRect(x, y, W, 10);
      c.fillStyle = blink ? INK : PAPER;
      c.font = '8px Tiny5, monospace';
      c.textBaseline = 'middle';
      c.fillText('Мелоди · сообщение', x + 24, y + 5);
      // close box
      c.fillStyle = PAPER;
      c.fillRect(x + W - 9, y + 2, 7, 6);
      c.fillStyle = INK;
      c.fillRect(x + W - 7, y + 4, 3, 2);
      // her portrait as the icon, sitting over the title bar
      c.fillStyle = PINK;
      c.fillRect(x + 2, y + 2, 19, 19);
      p.icon(x + 3, y + 3, 17);
      c.fillStyle = INK;
      c.font = '8px Tiny5, monospace';
      wrap(c, n.text, W - 28).slice(0, 2).forEach((line, j) => c.fillText(line, x + 24, y + 16 + j * 9));
    });
  }
}

function wrap(c: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > width && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

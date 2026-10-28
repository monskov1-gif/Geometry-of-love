// Centralised keyboard input. Screens and overlays push handler layers; only
// the top layer receives actions, so an open menu or backlog can never
// advance the dialogue underneath it.

export type Action = 'advance' | 'backlog' | 'hide' | 'auto' | 'skip-start' | 'skip-end' | 'menu' | 'back';

export type ActionHandler = (action: Action, event: KeyboardEvent) => void;

// Letters use KeyboardEvent.code so they work in any keyboard layout (ЙЦУКЕН too).
const KEYDOWN: Record<string, Action> = {
  Enter: 'advance',
  Space: 'advance',
  NumpadEnter: 'advance',
  KeyL: 'backlog',
  KeyH: 'hide',
  KeyA: 'auto',
  ControlLeft: 'skip-start',
  ControlRight: 'skip-start',
  Escape: 'menu',
  Backspace: 'back',
};
const KEYUP: Record<string, Action> = { ControlLeft: 'skip-end', ControlRight: 'skip-end' };

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export class InputManager {
  private layers: { name: string; handler: ActionHandler }[] = [];

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => this.dispatch(KEYDOWN, e));
    target.addEventListener('keyup', (e) => this.dispatch(KEYUP, e));
  }

  /** Adds a layer on top; call the returned function to remove it. */
  push(name: string, handler: ActionHandler): () => void {
    const layer = { name, handler };
    this.layers.push(layer);
    return () => {
      this.layers = this.layers.filter((l) => l !== layer);
    };
  }

  get top(): string | null {
    return this.layers.at(-1)?.name ?? null;
  }

  private dispatch(map: Record<string, Action>, e: KeyboardEvent): void {
    const action = map[e.code];
    if (!action) return;
    if (isTyping(e.target) && action !== 'menu') return;
    // Focused buttons handle Enter/Space themselves (native click).
    if (action === 'advance' && e.target instanceof HTMLButtonElement) return;
    if (e.repeat && action !== 'advance') return;
    const layer = this.layers.at(-1);
    if (!layer) return;
    if (action === 'advance' || action === 'back') e.preventDefault();
    layer.handler(action, e);
  }
}

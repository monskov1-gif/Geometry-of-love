// A do-nothing 2D canvas for building 3D locations under Node (Vitest has no DOM):
// the location builders paint their textures into canvases; here every drawing
// call is accepted and ignored, so the scene graph (lights, materials, meshes)
// can be built and inspected without a browser.

const noop = () => undefined;

function fakeContext(canvas: { width: number; height: number }): unknown {
  const gradient = { addColorStop: noop };
  const target: Record<string | symbol, unknown> = {
    canvas,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createConicGradient: () => gradient,
    createPattern: () => ({}),
    measureText: (t: string) => ({ width: String(t).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h) * 4) }),
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h) * 4) }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : noop),
    set: (t, k, v) => {
      t[k] = v;
      return true;
    },
  });
}

function fakeCanvas(): unknown {
  const c: Record<string, unknown> = { width: 300, height: 150, style: {}, getContext: () => ctx, toDataURL: () => 'data:,', addEventListener: noop };
  const ctx = fakeContext(c as { width: number; height: number });
  return c;
}

/** Installs `document.createElement('canvas')` (and an image stub) if there is no DOM. */
export function installCanvasStub(): void {
  const g = globalThis as Record<string, unknown>;
  if (g.document) return;
  g.document = {
    createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas() : { style: {}, addEventListener: noop, setAttribute: noop }),
    createElementNS: (_ns: string, tag: string) => (tag === 'canvas' ? fakeCanvas() : { style: {} }),
  };
  g.OffscreenCanvas ??= class {
    width: number;
    height: number;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
    }
    getContext() {
      return fakeContext(this);
    }
  };
}

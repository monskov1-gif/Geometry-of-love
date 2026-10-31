// The Sandbox tool sprites (render/sprites/tools.ts and its modules) after the
// author's art: every frame stays inside the 24×48 canvas with feet on the
// floor, every emotion looks different, and eraser 1 keeps the coordinates
// world/erasure.ts rubs out.
import { describe, expect, it } from 'vitest';
import type { Emotion, Frame } from '../../game/src/render/sprites/humans';
import { drawCalculator, drawCompass, drawEraser, drawRuler } from '../../game/src/render/sprites/tools';

const EMOTIONS: Emotion[] = ['neutral', 'happy', 'sad', 'angry', 'scared', 'tired'];
type Draw = (put: (x: number, y: number, c: string) => void, f: Frame) => void;
const TOOLS: Record<string, Draw> = {
  calculator: drawCalculator,
  ruler: drawRuler,
  compass: drawCompass,
  'eraser-1': (p, f) => drawEraser(p, f, 1),
  'eraser-2': (p, f) => drawEraser(p, f, 2),
  'eraser-3': (p, f) => drawEraser(p, f, 3),
};

function render(draw: Draw, f: Frame): Map<string, string> {
  const px = new Map<string, string>();
  draw((x, y, c) => px.set(`${x},${y}`, c), f);
  return px;
}

const frame = (o: Partial<Frame> = {}): Frame => ({ facing: 'front', emotion: 'neutral', walk: -1, breath: 0, mouthOpen: false, ...o });

const allFrames: Frame[] = [];
for (const emotion of EMOTIONS)
  for (const breath of [0, 1] as const)
    for (const mouthOpen of [false, true]) allFrames.push(frame({ emotion, breath, mouthOpen }));
for (const walk of [0, 1, 2, 3]) allFrames.push(frame({ facing: 'side', walk }));

describe('tool sprites', () => {
  for (const [id, draw] of Object.entries(TOOLS)) {
    it(`${id}: every frame fits the 24×48 canvas and stands on the floor`, () => {
      for (const f of allFrames) {
        const px = render(draw, f);
        for (const key of px.keys()) {
          const [x, y] = key.split(',').map(Number) as [number, number];
          expect(x >= 0 && x < 24 && y >= 0 && y < 48, `${id} ${JSON.stringify(f)} pixel ${key}`).toBe(true);
        }
        expect([...px.keys()].some((k) => k.endsWith(',46')), `${id} feet on y=46`).toBe(true);
      }
    });

    // the compass is not on the new art sheet and keeps its old design (tired = neutral there)
    it.skipIf(id === 'compass')(`${id}: each emotion and the talking mouth change the face`, () => {
      const sig = (f: Frame) => JSON.stringify([...render(draw, f).entries()].sort());
      const faces = EMOTIONS.map((emotion) => sig(frame({ emotion })));
      expect(new Set(faces).size).toBe(EMOTIONS.length);
      expect(sig(frame({ mouthOpen: true }))).not.toBe(faces[0]);
    });

    it(`${id}: the walk cycle moves`, () => {
      const sigs = [0, 1, 2, 3].map((walk) => JSON.stringify([...render(draw, frame({ facing: 'side', walk })).entries()].sort()));
      expect(new Set(sigs).size).toBeGreaterThan(1);
    });
  }

  it('eraser 1 keeps the layout world/erasure.ts relies on', () => {
    for (const [walk, hop] of [[-1, 0], [1, 2], [3, 1]] as const) {
      const top = 30 - hop;
      const px = render(TOOLS['eraser-1']!, frame({ walk, facing: walk < 0 ? 'front' : 'side' }));
      // eyes at (10|14, top+3) on the front frame
      if (walk < 0) for (const x of [10, 14]) expect(px.get(`${x},${top + 3}`)).toBe('#22202a');
      // the face sample point is body colour, the legs start at top+13
      expect(px.get(`16,${top + 2}`)).toBe('#b3c1c4');
      expect(px.has(`8,${top + 13}`) || px.has(`10,${top + 13}`) || px.has(`11,${top + 13}`) || px.has(`9,${top + 13}`)).toBe(true);
      for (const key of px.keys()) {
        const [x, y] = key.split(',').map(Number) as [number, number];
        expect(x >= 5 && x <= 18 && y >= top, `body/legs inside the erasure box: ${key}`).toBe(true);
      }
    }
  });
});

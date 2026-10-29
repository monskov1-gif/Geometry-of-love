import { describe, expect, it } from 'vitest';
import { locations3D } from '../../game/src/world/locations';
import { CANDY_STATES } from '../../game/src/world/candy/states';
import { inCircle, inHeart, inStar } from '../../game/src/world/candy/shapes';

describe('candy locations', () => {
  it('registers every in-game place of volumes II–III as a 3D location with the candy states', () => {
    for (const id of ['sandbox', 'sandbox-dim', 'study-room', 'corridor', 'archive']) {
      const def = locations3D[id];
      expect(def, id).toBeDefined();
      expect(def!.states).toEqual([...CANDY_STATES]);
      expect(def!.states).toContain(def!.defaultState);
    }
    expect(locations3D['sandbox-dim']!.defaultState).toBe('dim');
  });
});

describe('pixel shape rasterisers', () => {
  it('are filled in the middle and empty in the corners', () => {
    for (const f of [inCircle, inHeart, inStar()]) {
      expect(f(0, 0.1)).toBe(true);
      expect(f(0.98, 0.98)).toBe(false);
      expect(f(-0.98, -0.98)).toBe(false);
    }
  });
  it('are mirror-symmetric left to right', () => {
    for (const f of [inCircle, inHeart, inStar()])
      for (let v = -0.9; v <= 0.9; v += 0.3) for (let u = 0.1; u <= 0.9; u += 0.2) expect(f(u, v)).toBe(f(-u, v));
  });
});

// One World3D (one WebGL context) for the whole page: screens borrow it and
// give it back. Created on first use, so the title screen and tests that never
// enter a 3D location do not pay for it.
import { World3D } from './world';

let world: World3D | null = null;

export function getWorld(): World3D {
  world ??= new World3D();
  return world;
}

export function peekWorld(): World3D | null {
  return world;
}

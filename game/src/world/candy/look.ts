// The camera "film" of the candy world. Its walls are pale pastel paper: with the
// default bloom threshold every wall is "bright" and the whole frame blooms into a
// white haze. Only real light sources (glitter, lamp shades, the sky) may bloom.
import type { LocationLook } from '../types';

export const CANDY_LOOK: Partial<LocationLook> = { exposure: 1.0, bloom: 0.32, threshold: 1.0 };

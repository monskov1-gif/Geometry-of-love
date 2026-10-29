import { dameoRoom } from './dameo-room';
import type { LocationDef } from './types';

/** Painted locations by background id. Backgrounds without an entry fall back to CSS. */
export const locations: Record<string, LocationDef> = Object.fromEntries([dameoRoom].map((l) => [l.id, l]));
export type { LocationDef };

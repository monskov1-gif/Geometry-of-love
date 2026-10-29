// Registry of 3D locations by background id (the ids the story uses in `background(...)`).
import type { LocationDef3D } from '../types';
import { dameoRoom3D } from './dameo-room';

export const locations3D: Record<string, LocationDef3D> = Object.fromEntries([dameoRoom3D].map((l) => [l.id, l]));

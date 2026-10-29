// Registry of 3D locations by background id (the ids the story uses in `background(...)`).
import type { LocationDef3D } from '../types';
import { dameoRoom3D } from './dameo-room';
import { universityHall3D, universityLibrary3D } from './university';
import { collapse3D } from './collapse';
import { sandbox3D, sandboxDim3D } from './sandbox';
import { studyRoom3D } from './study-room';
import { corridor3D } from './corridor';
import { archive3D } from './archive';

export const locations3D: Record<string, LocationDef3D> = Object.fromEntries(
  [dameoRoom3D, universityHall3D, universityLibrary3D, collapse3D, sandbox3D, sandboxDim3D, studyRoom3D, corridor3D, archive3D].map((l) => [l.id, l]),
);

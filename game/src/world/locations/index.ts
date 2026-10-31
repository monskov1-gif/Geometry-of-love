// Registry of 3D locations by background id (the ids the story uses in `background(...)`).
import type { LocationDef3D } from '../types';
import { dameoRoom3D } from './dameo-room';
import { universityHall3D, universityLibrary3D } from './university';
import { collapse3D } from './collapse';
import { sandbox3D, sandboxDim3D } from './sandbox';
import { studyRoom3D } from './study-room';
import { corridor3D } from './corridor';
import { archive3D } from './archive';
import { classroom3D } from './classroom';
import { exitLevel3D } from './exit-level';
import { codeSpace3D } from './code-space';
import { techDoor3D } from './tech-door';
import { chasm3D } from './chasm';
import { streetDusk3D } from './street-dusk';

export const locations3D: Record<string, LocationDef3D> = Object.fromEntries(
  [dameoRoom3D, universityHall3D, universityLibrary3D, classroom3D, collapse3D, exitLevel3D, sandbox3D, sandboxDim3D, studyRoom3D, corridor3D, archive3D, codeSpace3D, techDoor3D, chasm3D, streetDusk3D].map((l) => [l.id, l]),
);

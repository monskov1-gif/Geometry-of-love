// Background registry. No background art exists yet, so every entry is a
// labelled placeholder drawn with CSS in the palette of its space.
import type { SpaceId } from '../core/types';

export interface BackgroundDef {
  id: string;
  space: SpaceId;
  /** Present while the background is a placeholder. */
  placeholder?: string;
  src?: string;
}

export const backgrounds: Record<string, BackgroundDef> = {
  'dameo-room': { id: 'dameo-room', space: 'reality', placeholder: 'ФОН-ЗАГЛУШКА: комната Дамео' },
  'app-notebook': { id: 'app-notebook', space: 'app' },
  'code-space': { id: 'code-space', space: 'code', placeholder: 'ФОН-ЗАГЛУШКА: системное пространство' },
};

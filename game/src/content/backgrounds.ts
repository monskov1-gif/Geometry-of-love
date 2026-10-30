// Background registry. No background art exists yet: every entry is a
// labelled placeholder drawn with CSS (styles/backgrounds.css) in the palette
// of its space. Give an entry a `src` once real art exists.
import type { SpaceId } from '../core/types';

export interface BackgroundDef {
  id: string;
  space: SpaceId;
  /** Present while the background is a placeholder. */
  placeholder?: string;
  src?: string;
}

const bg = (id: string, space: SpaceId, label: string): BackgroundDef => ({
  id,
  space,
  placeholder: `ФОН-ЗАГЛУШКА: ${label}`,
});

export const backgrounds: Record<string, BackgroundDef> = Object.fromEntries(
  [
    bg('dameo-room', 'reality', 'комната Дамео'),
    bg('dameo-desk', 'reality', 'стол Дамео, монитор'),
    bg('university-library', 'reality', 'библиотека университета'),
    bg('university-hall', 'reality', 'коридор университета'),
    bg('university-classroom', 'reality', 'аудитория 308'),
    bg('street-dusk', 'reality', 'улица вечером'),
    bg('desktop', 'reality', 'рабочий стол компьютера'),
    bg('app-splash', 'app', 'заставка приложения'),
    { id: 'app-notebook', space: 'app' } as BackgroundDef,
    bg('exit-level', 'game', 'учебный уровень «Выход»'),
    bg('monitor-back', 'game', 'обратная сторона монитора'),
    bg('study-room', 'game', 'учебная комната'),
    bg('sandbox', 'game', 'Песочница'),
    bg('sandbox-dim', 'game', 'Песочница, застывшая'),
    bg('corridor', 'game', 'коридор'),
    bg('archive', 'game', 'старый архив'),
    bg('tech-door', 'game', 'механическая дверь'),
    bg('chasm', 'game', 'пропасть у архивов'),
    bg('code-space', 'code', 'технический коридор'),
    bg('system-files', 'code', 'системный раздел'),
    bg('collapse', 'code', 'разрушающийся мир'),
  ].map((b) => [b.id, b]),
);

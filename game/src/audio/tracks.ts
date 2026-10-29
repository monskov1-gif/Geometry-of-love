// Registry of the synthesised themes (original chiptune compositions; style
// reference: the 8-bit tracks the author shared, no material taken from them).
// Scores are in themes-*.ts, the score format in score.ts, the map of which
// theme plays where in content/music-map.ts and docs/MUSIC.md.
import type { Track } from './score';
import { grief, homeNight, tension, title, university } from './themes-world';
import { appSweet, appUneasy, codeSpace, friends, gameCute, gameWrong } from './themes-melody';
import { endingBeyondScreen, endingFavouriteStudent, endingSelfTaught } from './themes-endings';

export type { Track } from './score';
export { chordNotes, trackDuration } from './score';

export const TRACKS: Record<string, Track> = {
  title,
  'home-night': homeNight,
  university,
  'app-sweet': appSweet,
  'app-uneasy': appUneasy,
  'game-cute': gameCute,
  'game-wrong': gameWrong,
  friends,
  tension,
  'code-space': codeSpace,
  grief,
  'ending-self-taught': endingSelfTaught,
  'ending-favourite-student': endingFavouriteStudent,
  'ending-beyond-screen': endingBeyondScreen,
};

/**
 * Older ids that scenes and cutscenes may still name. The engine plays the
 * theme they point to. In story scenes 'reality', 'app' and 'sandbox' mean
 * "this space's theme here": content/music-map.ts resolves them by scene and
 * location first, so music('reality') at the university plays 'university'.
 */
export const TRACK_ALIASES: Record<string, string> = {
  reality: 'home-night',
  app: 'app-sweet',
  sandbox: 'game-cute',
  horror: 'game-wrong',
  erasure: 'grief',
  chase: 'tension',
  rainbow: 'friends',
  epilogue: 'ending-beyond-screen',
  'ending-favorite-student': 'ending-favourite-student',
};

/** Alias → theme id; any other id is returned unchanged. */
export function resolveTrackId(id: string): string {
  return TRACK_ALIASES[id] ?? id;
}

/** Ids of the synthesised themes (aliases not included). */
export const TRACK_IDS = Object.keys(TRACKS);

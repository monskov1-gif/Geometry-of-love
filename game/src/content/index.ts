import type { ContentIndex } from '../core/validate';
import { episodes } from '../episodes/registry';
import { backgrounds } from './backgrounds';
import { characters } from './characters';
import { endings } from './endings';
import { flags, relationships, traits } from './variables';
import { cutscenes } from './cutscenes';
import { TRACK_IDS } from '../audio/tracks';
import { RECORDED_IDS } from '../audio/recorded';
import { SOUND_IDS } from '../audio/sfx';

export { story } from './story';
export { backgrounds, characters, endings, episodes };

export const contentIndex: ContentIndex = {
  characters: Object.fromEntries(Object.values(characters).map((c) => [c.id, Object.keys(c.poses)])),
  backgrounds: Object.keys(backgrounds),
  episodes: Object.keys(episodes),
  endings: Object.keys(endings),
  flags: Object.keys(flags),
  relationships: Object.keys(relationships),
  traits: Object.keys(traits),
  cutscenes: Object.keys(cutscenes),
  tracks: [...TRACK_IDS, ...RECORDED_IDS],
  sounds: SOUND_IDS,
};

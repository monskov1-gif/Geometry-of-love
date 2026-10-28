import type { ContentIndex } from '../core/validate';
import { episodes } from '../episodes/registry';
import { backgrounds } from './backgrounds';
import { characters } from './characters';
import { endings } from './endings';
import { flags, relationships, traits } from './variables';

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
};

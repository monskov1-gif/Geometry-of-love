// Japanese voice-over: which audio file speaks which line. Lines are matched by
// speaker + the Russian text shown on screen (the registry id is a hash of both),
// so a reworded line loses its voice instead of playing the wrong one.
// Built by scripts/voice (extract-lines.mjs → translation → render_all.py); see docs/VOICE.md.
import registry from './registry.json';

const files = import.meta.glob('../../assets/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const urlById = new Map(Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));

interface Line {
  speaker: string;
  ru: string;
  status: string;
}

const HAS_AUDIO = new Set(['synthesized', 'checked', 'integrated']);

const byText = new Map<string, string>();
for (const [id, line] of Object.entries(registry.lines as Record<string, Line>)) {
  const url = urlById.get(id);
  if (url && HAS_AUDIO.has(line.status)) byText.set(`${line.speaker}|${line.ru}`, url);
}

/** URL of the voice for this line, or null when it is not voiced. */
export function voiceFor(speaker: string | null | undefined, text: string): string | null {
  return speaker ? (byText.get(`${speaker}|${text}`) ?? null) : null;
}

export const voicedLineCount = byText.size;

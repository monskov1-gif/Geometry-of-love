// The Japanese voice-over covers every spoken line: each one has a registry entry
// with a translation and a real, non-empty audio file of its own.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cutscenes } from '../../game/src/content/cutscenes';
import { story } from '../../game/src/content/story';
import registry from '../../game/src/content/voice/registry.json';

const lineId = (speaker: string, text: string) => createHash('sha1').update(`${speaker}|${text}`).digest('hex').slice(0, 10);
const VOICE_DIR = resolve(__dirname, '../../game/src/assets/voice');
const lines = registry.lines as Record<string, { speaker: string; ru: string; ja: string; yomi: string; status: string }>;

function spokenLines(): { speaker: string; text: string; where: string }[] {
  const out: { speaker: string; text: string; where: string }[] = [];
  for (const scene of Object.values(story.scenes)) {
    scene.steps.forEach((s, i) => {
      if (s.type === 'say' && s.speaker && (s.kind ?? 'speech') === 'speech') out.push({ speaker: s.speaker, text: s.text, where: `${scene.id}#${i}` });
    });
  }
  type Cue = { do: string; speaker?: string; text?: string; cues?: Cue[] };
  const walk = (id: string, cues: Cue[]) =>
    cues.forEach((c, i) => {
      if (c.do === 'par' && c.cues) walk(id, c.cues);
      else if (c.do === 'line' && c.speaker && c.text) out.push({ speaker: c.speaker, text: c.text, where: `cutscene:${id}#${i}` });
    });
  for (const cs of Object.values(cutscenes)) walk(cs.id, cs.cues as Cue[]);
  return out;
}

describe('Japanese voice-over', () => {
  it('every spoken line is in the registry, translated and rendered', () => {
    const missing = spokenLines().filter((l) => {
      const entry = lines[lineId(l.speaker, l.text)];
      // a wordless line («…») is allowed to stay silent
      if (entry?.status === 'silent') return /[\p{L}\p{N}]/u.test(l.text);
      return !entry || !entry.ja || !entry.yomi || !['synthesized', 'checked', 'integrated'].includes(entry.status);
    });
    // re-run scripts/voice (see docs/VOICE.md) after changing spoken lines
    expect(missing.map((l) => `${l.where} ${l.speaker}: ${l.text}`)).toEqual([]);
  });

  it('every rendered line has its own non-empty audio file', () => {
    for (const [id, l] of Object.entries(lines)) {
      if (!['synthesized', 'checked', 'integrated'].includes(l.status)) continue;
      const file = resolve(VOICE_DIR, `${id}.mp3`);
      expect(existsSync(file), `${id} (${l.speaker}: ${l.ru})`).toBe(true);
      expect(statSync(file).size, `${id} is too small to hold speech`).toBeGreaterThan(3000);
    }
  }, 30_000); // reads ~500 files: slow when the whole suite runs in parallel

  it('registry ids match their speaker and text, and the readings are kana only', () => {
    for (const [id, l] of Object.entries(lines)) {
      expect(lineId(l.speaker, l.ru)).toBe(id);
      if (l.yomi) expect(l.yomi, id).not.toMatch(/[一-鿿A-Za-z0-9]/);
    }
  });

  it('no two lines share one audio file', () => {
    const sizes = new Map<string, string>();
    for (const [id, l] of Object.entries(lines)) {
      if (!['synthesized', 'checked', 'integrated'].includes(l.status)) continue;
      const bytes = readFileSync(resolve(VOICE_DIR, `${id}.mp3`));
      const hash = createHash('sha1').update(bytes).digest('hex');
      expect(sizes.get(hash), `${id} has the same audio as ${sizes.get(hash)}`).toBeUndefined();
      sizes.set(hash, id);
    }
  }, 30_000);
});

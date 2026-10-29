// Lists every voiced line in the script (story `say` steps with a speaker and kind
// 'speech', and cutscene `line` cues with a speaker) into the voice registry
// game/src/content/voice/registry.json, keeping translations and statuses already there.
// Line id = first 10 hex of sha1(speaker + '|' + text): stable while the text is unchanged.
// Run: node scripts/voice/extract-lines.mjs
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(root, 'game/src/content/voice/registry.json');

export const lineId = (speaker, text) => createHash('sha1').update(`${speaker}|${text}`).digest('hex').slice(0, 10);

const server = await createServer({ root: resolve(root, 'game'), configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { story } = await server.ssrLoadModule('/src/content/story/index.ts');
  const { cutscenes } = await server.ssrLoadModule('/src/content/cutscenes/index.ts');
  const old = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')).lines : {};
  const lines = {};
  const add = (speaker, text, where, phase) => {
    const id = lineId(speaker, text);
    const prev = old[id];
    lines[id] ??= { speaker, ru: text, phase, where: [], ja: prev?.ja ?? '', yomi: prev?.yomi ?? '', emotion: prev?.emotion ?? 'calm', status: prev?.status ?? 'not-prepared' };
    lines[id].where.push(where);
  };
  for (const scene of Object.values(story.scenes ?? story)) {
    let phase = 'A';
    scene.steps.forEach((s, i) => {
      if (s.type === 'space' && s.phase) phase = s.phase;
      if (s.type === 'say' && s.speaker && (s.kind ?? 'speech') === 'speech') add(s.speaker, s.text, `${scene.id}#${i}`, phase);
    });
  }
  for (const cs of Object.values(cutscenes)) {
    const walk = (cues) => cues.forEach((c, i) => (c.do === 'par' ? walk(c.cues) : c.do === 'line' && c.speaker && add(c.speaker, c.text, `cutscene:${cs.id}#${i}`, cs.id === 'melody-transforms' ? 'E' : 'C')));
    walk(cs.cues);
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ note: 'Voice registry: see docs/VOICE.md. status: not-prepared | prepared | synthesized | checked | integrated | needs-fix', lines }, null, 1) + '\n');
  const bySpeaker = {};
  for (const l of Object.values(lines)) bySpeaker[l.speaker] = (bySpeaker[l.speaker] ?? 0) + 1;
  console.log(`${Object.keys(lines).length} voiced lines`, bySpeaker);
} finally {
  await server.close();
}

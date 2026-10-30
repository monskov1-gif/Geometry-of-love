// Prints every moment two visible characters share a stage mark (core/validate.ts
// findStagingClashes) — the same check tests/unit/content.test.ts runs.
// Run: node scripts/staging-clashes.mjs
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../game');
const server = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { story } = await server.ssrLoadModule('/src/content/story/index.ts');
  const { findStagingClashes } = await server.ssrLoadModule('/src/core/validate.ts');
  const clashes = findStagingClashes(story);
  console.log(clashes.length ? clashes.join('\n') : 'no clashes');
} finally {
  await server.close();
}

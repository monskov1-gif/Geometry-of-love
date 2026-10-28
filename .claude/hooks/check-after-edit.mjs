#!/usr/bin/env node
// PostToolUse hook: after Claude edits a TypeScript file, run the typecheck
// (and the content validator when story/content files change). Read-only:
// it never modifies files, commits or publishes. Exit code 2 feeds the
// errors back to Claude so it can fix them; 0 means nothing to report.
import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
let file = '';
try {
  file = JSON.parse(input)?.tool_input?.file_path ?? '';
} catch {
  process.exit(0); // not a file edit payload
}
const rel = relative(root, file).replaceAll('\\', '/');
if (!/^(game\/src|tests)\/.*\.ts$/.test(rel)) process.exit(0);

const run = (args) => execFileSync('npx', args, { cwd: root, stdio: 'pipe', timeout: 90_000, encoding: 'utf8' });
try {
  run(['tsc', '--noEmit', '-p', 'tsconfig.json']);
  if (rel.startsWith('game/src/content/')) run(['vitest', 'run', 'tests/unit/content.test.ts']);
} catch (e) {
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim().split('\n').slice(-40).join('\n');
  process.stderr.write(`Automatic check failed after editing ${rel}:\n${out}\n`);
  process.exit(2);
}

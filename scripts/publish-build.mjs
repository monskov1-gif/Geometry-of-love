// Copies the production build (dist/) to the repository root, where the
// GitHub Pages "Deploy from a branch: main / (root)" setting serves it.
// Only index.html and assets/ at the root are generated; never edit them by hand.
import { cpSync, existsSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

rmSync(join(root, 'assets'), { recursive: true, force: true });
cpSync(join(dist, 'assets'), join(root, 'assets'), {
  recursive: true,
  filter: (src) => statSync(src).isDirectory() || !src.endsWith('.map'),
});
cpSync(join(dist, 'index.html'), join(root, 'index.html'));
// Serve files as-is: no Jekyll processing of the published root.
writeFileSync(join(root, '.nojekyll'), '');

console.log(`Published build to repository root: index.html + assets/ (${readdirSync(join(root, 'assets')).length} files)`);

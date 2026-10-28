import { defineConfig } from 'vitest/config';

// The game lives in ./game so that the legacy GitHub Pages branch deployment
// (which serves the repository root) never picks up an unbuilt index.html.
// `base: './'` makes every built URL relative, so the same build works locally,
// under https://<user>.github.io/Geometry-of-love/ and under any other subpath.
export default defineConfig({
  root: 'game',
  base: './',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    sourcemap: true,
  },
  test: {
    root: '.',
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});

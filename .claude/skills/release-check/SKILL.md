---
name: release-check
description: Verify Geometry of Love before merging to main / publishing a new version on GitHub Pages. Use when the user asks to release, publish or merge.
---

# Release check

1. `git status` clean (or only intended changes); branch is not main; `git fetch origin main` and merge main in if it moved.
2. `npm ci && npm run check && npm run test:e2e` — all green. Paste the summary lines.
3. Manual pass in the browser on the built game (`npm run build && npx vite preview --base /Geometry-of-love/`), desktop and mobile viewport, following the checklist in docs/TESTING.md («Ручная проверка перед релизом»). Take screenshots and look at them.
4. Check that no placeholder or test content is presented as final: test scenes, «ВРЕМЕННАЯ ЗАГЛУШКА» sprites and placeholder backgrounds are listed in CHANGELOG.md / README «Статус».
5. Check for secrets: `git diff origin/main --stat` and grep the diff for tokens/keys.
6. Update CHANGELOG.md (version, date, notable changes) and the version in package.json.
7. Ask the user for permission to commit, push and open a pull request into main. After merge, the Deploy workflow publishes automatically; then open https://monskov1-gif.github.io/Geometry-of-love/ and confirm the new version loads (title screen, one sprite, no console errors). Only then report "published".

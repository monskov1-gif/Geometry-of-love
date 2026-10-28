---
name: new-scene
description: Add or extend a story scene (dialogue, choices, branches, mini-game calls, endings) in Geometry of Love from the synopsis or the author's script.
---

# New story scene

1. Find the source: the chapter in `materials/docs/Geometry of love Синопсис.pdf` (extract with `pdftotext -layout`) or the text the author gave. Do not write plot events or lines that are not in the source. If the author did not supply dialogue, ask, or mark lines with "(черновик)" and list them in the report.
2. Create `game/src/content/story/chapter-NN-<slug>.ts` exporting one `defineScene({...})` per scene. Use helpers from `game/src/core/script.ts` (say, narrate, think, system, show, hide, background, space, choice, branch, goto, episode, ending). Set `chapter` and a human `title` (it appears in save slots).
3. Register each scene in `game/src/content/story/index.ts`. Set `startScene` only when the user asks.
4. Every new character / pose / background / episode / ending / variable must exist in its registry under `game/src/content/` (characters.ts, backgrounds.ts, episodes registry, endings.ts, variables.ts). Variables need a `status` and a source note; Dameo's traits need the author's approval first (docs/GAME_DESIGN.md).
5. Choice options get stable `id`s. Do not reorder or delete steps in already released scenes without warning: saves store step indexes.
6. Run `npm test` (content validator), then `npm run test:e2e`. Play the new scene in the browser, take screenshots (`SHOTS_DIR=… npm run test:e2e`, or a Playwright script) and look at them.
7. Update docs/GAME_DESIGN.md (scene map / choices / variables) and CHANGELOG.md.

---
name: new-mechanic
description: Add a new game mechanic to Geometry of Love — a mini-game, an interactive cutscene, a new step type, a variable system or a screen. Use when the task needs new engine or episode code rather than new story content.
---

# New mechanic

1. Run the `preflight` skill. Confirm the mechanic is described in the synopsis/brief or requested by the author; list what is not specified (rules, win/lose conditions, controls) and ask before inventing it.
2. For anything beyond a single episode, ask the `game-architect` agent for a plan first.
3. Pick the extension point instead of a new subsystem:
   - mini-game or interactive cutscene → new file in `game/src/episodes/` implementing `EpisodeDefinition` (types.ts), registered in `episodes/registry.ts`. Pure logic (movement, scoring, collision) goes into exported functions so it can be unit-tested. Controls: keyboard + touch. Success only when the goal is met; failure → retry. Platformer jumps are allowed only inside mini-games the synopsis describes as platformers.
   - new step type → `core/types.ts` (Step), `core/runtime.ts` (settle/present), `core/validate.ts`, helper in `core/script.ts`, tests in tests/unit/runtime.test.ts.
   - new persistent state → StoryState + SAVE_SCHEMA bump + migration + test.
4. Implement with tests: unit tests for logic, an e2e step in tests/e2e for the player-visible path.
5. `npm run check && npm run test:e2e`; screenshot the new screen on desktop and mobile and look at it.
6. Ask the `code-reviewer` agent to review the diff. Fix findings.
7. Document: docs/ARCHITECTURE.md (if structure changed), docs/GAME_DESIGN.md, docs/DECISIONS.md (if a real choice was made), CHANGELOG.md.

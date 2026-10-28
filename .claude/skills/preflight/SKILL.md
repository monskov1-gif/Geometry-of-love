---
name: preflight
description: Check the Geometry of Love project state before starting a large piece of work — git state, failing checks, open questions in the docs. Use at the start of any multi-file task.
---

# Preflight

1. `git status` and `git log --oneline -5`. If there are uncommitted changes you did not make, stop and ask the user what to do with them. Never stash, reset or discard them yourself.
2. `git fetch origin main` and compare: `git log --oneline HEAD..origin/main`. If main moved (for example new reference images uploaded through the GitHub web UI), tell the user and bring them in only with `git merge --ff-only` or a normal merge, never a rebase of someone else's work.
3. `npm ci` if node_modules is missing or package-lock.json changed, then `npm run check`. Record results. If something is already red, report it before you change anything, so pre-existing failures are not mixed with yours.
4. Re-read the parts of CLAUDE.md, docs/ARCHITECTURE.md, docs/GAME_DESIGN.md («Открытые вопросы») and docs/DECISIONS.md that touch the task.
5. State in 3–6 lines: what you will change, which modules, which checks will prove it, and which decisions need the author.

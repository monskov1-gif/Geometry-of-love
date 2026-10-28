---
name: fix-bug
description: Find and fix a bug in Geometry of Love with a reproducing test first. Use when the user reports something broken or a check fails.
---

# Fix a bug

1. Reproduce. Write down exact steps. Prefer an automated reproduction: a failing unit test (tests/unit) for logic, a failing Playwright test (tests/e2e) for UI/flow. If you cannot reproduce, say so and report what you tried. Do not guess-fix.
2. Find the root cause: read the module and its callers; check whether the bug is in story data (validator should catch it?), runtime, UI state, storage or deploy paths.
3. Fix minimally in the module that owns the behaviour. Do not hide the symptom (no empty catch, no disabled check, no skipped test).
4. The reproducing test now passes; run `npm run check && npm run test:e2e`.
5. If the content validator could have caught it, extend `core/validate.ts`.
6. Report: cause, fix, test added, checks run, anything still unverified. Add a CHANGELOG.md line.

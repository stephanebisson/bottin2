---
description: Test, build, commit, push and deploy (deploy target chosen from what changed)
argument-hint: [optional commit message hint]
---

Run the full ship sequence. Stop at the first failure and report it with its output — never skip a failing step.

1. **Test and build** — run `npm test` (lint with --fix, then vitest), then `npm run build:prod`. If either fails, stop: nothing gets committed, pushed or deployed. Lint may have auto-fixed files; those fixes go into the commit. Always build, even when only functions or rules changed.

2. **Commit** — if the working tree has changes, review `git status` and `git diff`, stage the relevant files (never secrets, `credentials/`, backups, or stray temp files — ask if unsure), and commit with a concise message in the style of recent `git log` subjects. $ARGUMENTS may hint at the message. End the message with the usual co-author trailer. If there is nothing to commit, skip this step and continue with any unpushed commits.

3. **Push** — `git push` to origin for the current branch. If there is nothing to push, say so and stop (nothing new to deploy).

4. **Deploy** — before pushing, record the files changed in all commits being pushed: `git diff --name-only @{u}..HEAD` (fall back to `origin/main..HEAD`). Pick the deploy from that list:
   - Only `src/`, `public/`, `index.html`, `vite.config.mjs` → `npm run deploy` (hosting)
   - Only `functions/` → `firebase deploy --only functions`
   - Only `firestore.rules` and/or `firestore.indexes.json` → `firebase deploy --only firestore`
   - A combination of the above → `firebase deploy --only <targets>` with the matching targets (`hosting` requires `npm run build:prod` first)
   - Nothing deployable (only docs, tests, `scripts/`, `.claude/`, etc.) → no deploy; say so
   - Anything else or any doubt (`firebase.json`, `package.json`, lockfiles, unfamiliar paths) → `npm run deploy:all`

   State which deploy you chose and why before running it.

5. **Report** — one short summary: test result, commit hash, push result, deploy command and outcome.

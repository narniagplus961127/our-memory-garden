## Agent skills

### Issue tracker

Issues are tracked as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels are used as status values. See `docs/agents/triage-labels.md`.

### Domain docs

This project uses a single-context layout. See `docs/agents/domain.md`.

## Delivery

After completing each ticket, commit its changes and push the working branch to `https://github.com/narniagplus961127/our-memory-garden`. Keep disposable experiments on prototype branches and record known limitations in the relevant ticket.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Unattended Execution Kick-Off

You are executing this repo's implementation plan unattended. Read this document in full before taking any action.

## Goal

Complete **Phases 1 through 9** of [`docs/implementation-todo.md`](./implementation-todo.md). Do not begin Phase 10.

## Required reading (in this order)

1. This file.
2. The `Unattended Execution Rules` and `Pre-Flight Checklist` sections at the top of [`docs/implementation-todo.md`](./implementation-todo.md).
3. [`AGENTS.md`](../AGENTS.md) for project conventions (formatting, Tamagui, testing, accessibility, backend conventions).
4. [`docs/app-architecture-overview.md`](./app-architecture-overview.md) as your reference whenever a step in the todo is ambiguous.

When a conflict appears, the precedence is: explicit human instructions > `AGENTS.md` > `docs/app-architecture-overview.md` > `docs/implementation-todo.md`.

## First actions (in order)

1. Create `PROGRESS.md` at the repo root with an opening entry that records the start timestamp and the commit hash of `HEAD`.
2. Run the **Pre-Flight Checklist** in `docs/implementation-todo.md`. Record any failures to `PROGRESS.md` as `BLOCKED:` entries, then continue where possible.
3. Verify the working tree is clean. If it is not, stop and record the block — do not discard or stash unknown work.
4. Create and check out a feature branch named `feat/phases-1-to-9` from `main`.
5. Begin Phase 1.

## Execution policy

Follow the `Unattended Execution Rules` section of the todo exactly. The key rules:

- **Progress reporting**: `PROGRESS.md` is append-only. Add an entry every time a phase starts, a phase completes, or you get stuck. Each entry records phase, step, outcome (`done` / `skipped` / `blocked`), short reason, and any follow-ups.
- **Keep-moving-forward**: if a step blocks for more than a reasonable attempt, append a `BLOCKED:` entry and continue with the next non-dependent step. Never skip verification silently. Never fabricate credentials, fake API responses, or stub missing infrastructure.
- **Commit discipline**: one commit per completed phase with message `phase N: <phase title>`. Sub-commits mid-phase are allowed at natural seams; every commit must leave the tree building and passing typecheck. No amending, no force-push, no squashing.
- **Scope**: Phases 1–9 only. Do not begin Phase 10.

## Hard stops (do not do any of these without recorded human approval)

- Begin Phase 10 or later.
- Open a pull request.
- Push to `main`.
- Run `vercel --prod` (preview deploys via plain `vercel` are allowed).
- Amend, rebase, squash, or force-push.
- Commit `.env`, credentials, or a red tree.
- Run destructive DB operations against anything other than the dedicated local or test database.
- Modify `.env` values that already have content (you may add new keys only if a phase explicitly needs them, and you must record the addition in `PROGRESS.md`).

## CLIs available (all installed and logged in)

- `supabase` — local DB lifecycle (`supabase start`, `db reset`, `db lint`) and remote `db push`/`migration` commands
- `firebase` — `firebase apps:sdkconfig web` for cross-checking client bundle values when useful
- `vercel` — `vercel link`, `vercel env add`, `vercel pull`, preview deploy via plain `vercel`
- `gh` — GitHub queries and issue reads
- `jq` — JSON handling for service account / logs
- `node`, `npm`, `git`

## What "done" means

Phase 9 completes, all phase verification steps are recorded as passed or `BLOCKED:` in `PROGRESS.md`, and a final `PROGRESS.md` entry summarizes:

- Which phases fully passed.
- Which phases completed with blocks (and what remains).
- The current commit hash on `feat/phases-1-to-9`.
- Any recommendations for the human before Phase 10 starts.

Stop after writing that summary. Do not merge, push, or open a PR.

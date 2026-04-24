# Kanban Next Steps

This is the master roadmap for the next milestone after the board backend and board frontend passes. Each numbered item below is executed as a dedicated agent session. Session files live in [`docs/next-steps/`](./next-steps/) and each one is self-contained: pre-reads, preconditions, actionable checklist, verification, commit points, and a definition of done.

## How to Use This Document

- Read the _Current State_ section to confirm the entry assumptions still hold.
- Pick the next unfinished session from _Recommended Order_ and open its file.
- Follow the session’s internal checklist; do not reshape work from memory.
- When a session completes, update the matching checkbox in [`kanban-frontend-implementation-checklist.md`](./kanban-frontend-implementation-checklist.md) and tick the session in _Recommended Order_ below.
- If a session blocks, append a `BLOCKED:` note to [`../PROGRESS.md`](../PROGRESS.md) and move to the next non-dependent session.

The full docs index is at [`docs/README.md`](./README.md). The slice-by-slice UX spec index is at [`docs/ux-specs/README.md`](./ux-specs/README.md).

## Current State

- Main board backend is implemented and tested.
- Main board frontend is implemented and builds successfully.
- The board routes support:
  - protected `/boards`
  - `/boards/$boardId`
  - create board
  - create, edit, move, reorder, and delete cards
  - create and rename columns (rename currently via modal — tracked by Session 04)
  - subtasks
  - board filters, grouping, and list mode
  - board rename and delete
- Current frontend status: [`kanban-frontend-implementation-checklist.md`](./kanban-frontend-implementation-checklist.md)
- Current backend status: [`kanban-backend-implementation-checklist.md`](./kanban-backend-implementation-checklist.md)

## Recommended Order

Execute top-down. Each session links to the self-contained checklist an agent should pick up.

- [ ] **Session 01 — Auth frontend**: [`next-steps/01-auth-frontend.md`](./next-steps/01-auth-frontend.md)
- [ ] **Session 02 — Signed-in browser QA**: [`next-steps/02-signed-in-qa.md`](./next-steps/02-signed-in-qa.md)
- [ ] **Session 03 — Frontend tests for board flows**: [`next-steps/03-frontend-tests.md`](./next-steps/03-frontend-tests.md)
- [ ] **Session 04 — Inline column rename**: [`next-steps/04-inline-column-rename.md`](./next-steps/04-inline-column-rename.md)
- [ ] **Session 05 — Bundle weight on the board route**: [`next-steps/05-bundle-split.md`](./next-steps/05-bundle-split.md)
- [ ] **Session 06 — Visual and interaction polish**: [`next-steps/06-polish.md`](./next-steps/06-polish.md)

## Why This Order

1. **Auth frontend first** — the board is now substantial enough that the auth experience must stop being a scaffold. Real signed-in QA depends on a real auth flow. Auth UX specs already exist, so this is mostly implementation.
2. **Signed-in QA** — the unauthenticated redirect was verified; the signed-in board flows were not fully exercised because `AGENT_LOGIN_EMAIL` was not available during the build. Do this before adding tests so the tests cover real behavior.
3. **Frontend tests** — cover route protection, verification gate, create-board, card + subtask flows, filter/view switching, and optimistic conflict recovery. Pays off immediately given the surface area now exists.
4. **Inline column rename** — the only missing checklist item from section 6. Spec already says the rename should be inline; the current modal is a stop-gap.
5. **Bundle splitting** — build warns about client chunk size. Keep non-board routes from paying for board-only code.
6. **Polish** — only after the product is correct and covered.

## Definition of the Next Milestone

The next milestone is complete when:

- [ ] Auth frontend matches the canonical auth UX spec
- [ ] Signed-in board flows have been browser-verified under both `VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION` modes
- [ ] Board route protection and key board interactions have frontend test coverage
- [ ] Column rename is inline, not modal
- [ ] `npm run build` is green and the board-route chunk warning is gone or materially reduced
- [ ] [`kanban-frontend-implementation-checklist.md`](./kanban-frontend-implementation-checklist.md) reflects those completions

Polish work (Session 06) is explicitly **not** part of this milestone; it is the first work _after_ the milestone closes.

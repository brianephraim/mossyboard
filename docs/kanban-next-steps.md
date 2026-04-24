# Kanban Next Steps

This document captures the highest-value work after the current board backend and board frontend implementation pass.

## Current State

- The main board backend is implemented and tested.
- The main board frontend is implemented and builds successfully.
- The board route now supports:
  - protected `/boards`
  - `/boards/$boardId`
  - create board
  - create, edit, move, reorder, and delete cards
  - create and rename columns
  - subtasks
  - board filters, grouping, and list mode
  - board rename and delete
- The current board frontend checklist is at [`docs/kanban-frontend-implementation-checklist.md`](./kanban-frontend-implementation-checklist.md).

## Recommended Order

## 1. Finish the Auth Frontend

This is the most important remaining product gap.

Why this is next:

- The board is now substantial enough that the auth experience should stop being a temporary scaffold.
- Full signed-in board QA depends on a real auth flow, not the current debug-style auth page.
- We already have the auth UX spec package; this is now mostly implementation work.

Deliverables:

- Implement the full auth/session frontend from the existing auth specs.
- Replace the raw HTML auth page with the Tamagui-based flow.
- Support:
  - sign in
  - sign up
  - password reset
  - verification reminder
  - verification-required gate
  - redirect back into `/boards`
- Make the auth route visually and interactionally consistent with the board shell quality bar.

Primary docs:

- [`docs/ux-specs/auth-session-boundaries.md`](./ux-specs/auth-session-boundaries.md)
- [`docs/ux-specs/auth-session-boundaries-frontend-build-brief.md`](./ux-specs/auth-session-boundaries-frontend-build-brief.md)

## 2. Do a Real Signed-In Browser QA Pass

Why this is next:

- The unauthenticated redirect path was browser-verified.
- The signed-in board flows were not fully browser-verified in this session because `AGENT_LOGIN_EMAIL` / `AGENT_LOGIN_PASSWORD` were not available.

Deliverables:

- Verify the full happy path in-browser:
  - sign in
  - create board
  - open board
  - create card
  - edit card
  - add/edit/toggle/delete subtask
  - create column
  - rename column
  - drag and keyboard move cards
  - drag and keyboard move columns
  - rename board
  - delete board
- Verify both verification modes:
  - `VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION=false`
  - `VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION=true`
- Log any UI bugs or flow regressions discovered during that pass.

## 3. Add Frontend Tests for the Board Flows

This is the most important engineering hardening step after signed-in QA.

Why this is next:

- We added helper tests and fixed real route/auth bugs during browser verification.
- The board UI now has enough behavior that component and route coverage will pay off immediately.

Highest-priority coverage:

- board route protection and redirect behavior
- verification gate behavior
- create-board dialog
- board detail loading/error/not-found states
- card detail open/edit/save/delete flow
- subtask create/toggle/edit/delete flow
- filter and list-mode switching
- optimistic conflict recovery rendering

Primary files to target:

- [`src/features/boards/`](../src/features/boards)
- [`src/routes/boards.tsx`](../src/routes/boards.tsx)
- [`src/routes/boards.$boardId.tsx`](../src/routes/boards.$boardId.tsx)
- [`src/routes/verify-email.tsx`](../src/routes/verify-email.tsx)

## 4. Bring Column Rename Back to the Spec Shape

Why this is next:

- The current implementation supports column rename, but through a modal.
- The checklist still leaves `inline column rename flow` unchecked.

Deliverables:

- Replace modal rename with the intended inline rename experience.
- Preserve keyboard accessibility and explicit save/cancel behavior.
- Re-verify that rename still behaves correctly during optimistic updates and conflict recovery.

Primary docs:

- [`docs/ux-specs/column-structure-management.md`](./ux-specs/column-structure-management.md)
- [`docs/ux-specs/column-structure-management-frontend-build-brief.md`](./ux-specs/column-structure-management-frontend-build-brief.md)

## 5. Reduce Bundle Weight on the Board Route

This is not a blocker, but it is the most obvious technical cleanup item from the build output.

Why this is next:

- The build is passing, but it emits a large client chunk warning.
- The board route now contains a lot of UI and DnD logic, so route-level code splitting is likely worth doing.

Deliverables:

- Split heavy board-only UI behind route boundaries or dynamic imports where reasonable.
- Keep the auth route and non-board routes from paying for board-only code.
- Re-run `npm run build` and confirm the warning trend improves.

## 6. Visual and Interaction Polish Pass

This is the right time only after the items above are done.

Focus areas:

- tighter spacing and typography polish against [`docs/ux-specs/mockup.png`](./ux-specs/mockup.png)
- better loading placeholders and empty states
- stronger visual treatment for selected filters and grouped board view
- more deliberate conflict and success feedback
- mobile ergonomics for the card detail modal and board canvas

## Suggested Immediate Sequence

If we want the shortest path to a strong next milestone, do this:

1. Implement the auth frontend from the existing auth specs.
2. Run a signed-in browser QA pass with real credentials.
3. Add frontend tests for route protection and key board flows.
4. Convert column rename from modal to inline.
5. Do bundle and polish cleanup.

## Definition of the Next Milestone

The next milestone is complete when:

- auth frontend matches the documented auth UX slice
- signed-in board flows are browser-verified
- board route protection and key board interactions have frontend coverage
- inline column rename is implemented
- the board frontend checklist reflects those completions

## Session 03: Frontend Tests for Board Flows

### Session goal

Add the first layer of frontend component and route tests for the board flows so the behavior exercised in Session 02 is locked in. Priority is route protection, verification gating, and the highest-risk board interactions.

### Pre-read

- [`AGENTS.md`](../../AGENTS.md) — _Testing_ section
- Skill: [`skills/test-writer/SKILL.md`](../../skills/test-writer/SKILL.md)
- [`docs/kanban-frontend-implementation-checklist.md`](../kanban-frontend-implementation-checklist.md) — section 8
- Existing unit tests to imitate: run `rg -l "from 'vitest'" src | head -n 20`
- Existing Playwright tests and helpers: [`e2e/`](../../e2e/), [`e2e/helpers/login.ts`](../../e2e/helpers/login.ts)

### Preconditions

- Session 01 landed.
- Session 02 QA findings either resolved or logged.
- `npm run test` currently green.

### Checklist

#### Route protection and verification gate

- [ ] Test: `/boards` redirects unauthenticated users to `/auth` with a `redirectTo` query param
- [ ] Test: `/boards/$boardId` redirects unauthenticated users to `/auth` preserving the deep link
- [ ] Test: when `VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION=true`, unverified signed-in users are routed to `/verify-email`
- [ ] Test: when `VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION=false`, unverified signed-in users see the reminder banner on protected routes

#### Create-board flow

- [ ] Test: `CreateBoardDialog` validates blank titles
- [ ] Test: submitting a valid title calls the create mutation once and routes to `/boards/$boardId`
- [ ] Test: failure renders a form-level error and preserves entered values

#### Board detail states

- [ ] Test: `/boards/$boardId` shows the loading state on first fetch
- [ ] Test: `/boards/$boardId` shows the not-found state on a 404
- [ ] Test: `/boards/$boardId` keeps stale content visible during a background refetch failure

#### Card flow

- [ ] Test: open card detail → edit title → save → close returns focus to the originating card
- [ ] Test: edit with discard prompts confirmation when dirty
- [ ] Test: delete confirmation dialog traps focus and closes on `Esc`

#### Subtask flow

- [ ] Test: create subtask inserts via composer and clears input
- [ ] Test: toggle subtask updates optimistic checked state
- [ ] Test: edit subtask round-trips value
- [ ] Test: delete subtask removes the row

#### Filter and view

- [ ] Test: filter control updates the visible card set
- [ ] Test: switching to list mode renders the paginated matching-cards list

#### Optimistic conflict recovery

- [ ] Test: simulated version-mismatch response triggers the board conflict recovery UI
- [ ] Test: recovered data replaces optimistic state without unmounting the board

### Verification

- `npm run test`
- `npm run build`
- `npx prettier --write` on every file touched
- No new `any` introduced (run `rg ": any" -n src | wc -l` before/after)

### Commit points

Group related tests into cohesive commits; keep each commit green on its own. Suggested split:

- `test: cover boards route protection and verification gate`
- `test: cover create-board dialog`
- `test: cover board detail loading/error/not-found states`
- `test: cover card detail edit/delete flows`
- `test: cover subtask composer and row states`
- `test: cover filter controls and list mode`
- `test: cover optimistic conflict recovery`

### Out of scope

- New product behavior or refactors (ship those in their own session)
- E2E Playwright expansion beyond existing coverage
- Backend tests

### Definition of done

The checklist items each have at least one green test, `npm run test` passes, and the frontend checklist’s Section 8 entries for test coverage are checked with references to the added specs.

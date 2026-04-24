## Session 02: Signed-In Browser QA Pass

### Session goal

Exercise every signed-in board flow in a real browser against the real backend, in both verification modes, and record any regressions. This is the first end-to-end pass after the auth frontend lands.

### Pre-read

- [`docs/kanban-app-requirements.md`](../kanban-app-requirements.md)
- [`docs/kanban-frontend-implementation-checklist.md`](../kanban-frontend-implementation-checklist.md)
- [`docs/ux-specs/mockup.png`](../ux-specs/mockup.png)
- [`docs/ux-specs/board-shell-and-board-loading-states.md`](../ux-specs/board-shell-and-board-loading-states.md)
- [`docs/ux-specs/card-detail-panel-or-modal.md`](../ux-specs/card-detail-panel-or-modal.md)
- [`docs/ux-specs/move-and-reorder-behavior.md`](../ux-specs/move-and-reorder-behavior.md)
- `AGENTS.md` → _Browser Testing Credentials_ for `AGENT_LOGIN_EMAIL` / `AGENT_LOGIN_PASSWORD`

### Preconditions

- Session 01 (auth frontend) has landed.
- `.env` contains `AGENT_LOGIN_EMAIL` and `AGENT_LOGIN_PASSWORD`.
- Local dev server is runnable (`npm run dev`) and reaches the real Supabase DB.
- A fresh test account, or an account you are free to mutate, is available.

### Checklist

#### Setup

- [ ] Start dev server
- [ ] Sign in with `AGENT_LOGIN_EMAIL` / `AGENT_LOGIN_PASSWORD`
- [ ] Confirm unauthenticated access to `/boards` redirects to `/auth`

#### Happy path with `VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION=false`

- [ ] Create a new board from `/boards`
- [ ] Route lands on `/boards/$boardId`
- [ ] Create a card in the first column
- [ ] Open the card detail (desktop panel and mobile full-screen modal)
- [ ] Edit title and description; confirm save + discard behaviors
- [ ] Add two subtasks
- [ ] Edit a subtask
- [ ] Toggle a subtask
- [ ] Delete a subtask
- [ ] Delete the card (confirmation flow)
- [ ] Create a new column at the end of the board
- [ ] Rename a column
- [ ] Drag a card within a column (reorder)
- [ ] Drag a card to a different column
- [ ] Use keyboard move for a card
- [ ] Drag a column to reorder
- [ ] Use keyboard move for a column
- [ ] Apply a filter, then switch to list view
- [ ] Group by an attribute; confirm board reorganizes
- [ ] Rename the board
- [ ] Delete the board; confirm post-delete `/boards` state

#### Verification-required path with `VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION=true`

- [ ] Restart dev server with verification required
- [ ] Sign in as an unverified test account
- [ ] Land on `/verify-email`; confirm blocked access to `/boards`
- [ ] Trigger resend, refresh, and sign-out actions

#### Regressions to watch for

- [ ] Optimistic rollback on simulated network failure (throttle or disable network mid-action)
- [ ] Stale content remains visible during background refresh failures
- [ ] Focus returns to invoking element when modals close
- [ ] `Esc` closes the card detail modal on mobile and the session-expired dialog
- [ ] No horizontal scroll on any auth, board, or card surface at 375px width

### Verification

- [ ] All checkboxes above exercised
- [ ] Regressions logged to [`docs/kanban-frontend-implementation-blockers.md`](../kanban-frontend-implementation-blockers.md) (create if missing)
- [ ] `npm run test` and `npm run build` still green
- [ ] Bugs that block Session 03+ are raised before continuing

### Commit points

This session is a QA pass, not a code change. Commit only if the QA run produces fixes or doc updates:

- `docs: record signed-in QA findings`
- `fix: <specific regression>` for each fix

If QA surfaces no issues, there may be nothing to commit. Record the QA completion in `PROGRESS.md` regardless.

### Out of scope

- Adding new functionality
- Frontend tests (covered in Session 03)
- Visual polish (covered in Session 06)

### Definition of done

Every happy-path interaction on the checklist either passes in the browser or has a corresponding logged blocker with enough detail for the next session to act on. `PROGRESS.md` contains a QA-pass entry with date and result.

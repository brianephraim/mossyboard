# Kanban Frontend Implementation Checklist

This checklist turns the current frontend briefs into an implementation-ordered execution plan.

## 1. Foundation and Shell

- [x] Add reactive auth/session client state for protected board routes
- [x] Add client env parsing for verification gating
- [x] Add `PrettyModalWrap` so dialogs and full-screen mobile modal flows share one base
- [x] Add board-theme tokens and shared board-shell composition primitives
- [x] Add `/boards`, `/boards/$boardId`, and `/verify-email` routes
- [x] Hide or replace the current scaffolding nav on board routes

## 2. Protected Boards Entry

- [x] Build the protected boards shell
- [x] Build the shared shell header with `Create board`, `Board settings`, and `Sign out`
- [x] Build the verification reminder banner and live-region anchor
- [x] Build `/boards` loading, loaded, empty, and error states
- [x] Build create-board dialog with `react-hook-form`
- [x] Route newly created boards to `/boards/$boardId`

## 3. Loaded Board Foundation

- [x] Build `/boards/$boardId` loading, loaded, error, and not-available states
- [x] Build responsive board canvas layout from the mockup direction
- [x] Render columns and read-only card summaries from backend data
- [x] Keep stale board content visible during background refresh failures

## 4. Cards and Detail Surface

- [x] Build per-column `Add card` flows
- [x] Build empty-column add-card state
- [x] Build route-driven card detail panel on desktop
- [x] Build full-screen card detail modal on mobile
- [x] Build card field form with explicit save and discard handling
- [x] Build delete-card confirmation flow
- [x] Build card-detail loading, retryable error, and not-available states

## 5. Subtasks

- [x] Build subtask empty state
- [x] Build subtask composer
- [x] Build subtask row read state
- [x] Build subtask row edit state
- [x] Build subtask toggle and delete flows

## 6. Columns, Board Settings, and Filters

- [x] Build board-end add-column flow
- [x] Build add-column-after flow
- [x] Build inline column rename flow
- [x] Build board settings dialog
- [x] Build board rename flow
- [x] Build board delete confirmation and `/boards` post-delete status
- [x] Build filter controls, group-by controls, and board/list view switching
- [x] Build matching-cards paginated list mode

## 7. Move and Reorder

- [x] Build card drag-and-drop with `@hello-pangea/dnd`
- [x] Build card non-drag move controls
- [x] Build column drag-and-drop
- [x] Build column non-drag move controls
- [x] Build optimistic rollback and board conflict recovery UI

## 8. Verification

- [x] Add frontend coverage for route protection and verification-gate behavior (`src/features/boards/BoardRouteGate.test.tsx`)
- [x] Add component or interaction tests for key board flows (`src/features/boards/BoardsIndexScreen.test.tsx`, `src/features/boards/BoardCanvas.inline-rename.test.tsx`, `src/features/auth/SignInForm.test.tsx`)
- [x] Run targeted tests during each milestone
- [x] Run a broad test pass at the end
- [x] Run `npm run build`

## 9. Blocker Handling

- [x] If a blocker appears, document it in `docs/kanban-frontend-implementation-blockers.md`
- [x] Move to the next non-blocked milestone when possible
- [ ] Return to unresolved blockers before finishing

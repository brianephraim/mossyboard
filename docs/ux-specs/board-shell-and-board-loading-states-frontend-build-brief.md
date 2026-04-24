# Frontend Build Brief: Board Shell and Board Loading States

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md)
- Wireframe brief: [`docs/ux-specs/board-shell-and-board-loading-states-wireframe-brief.md`](./board-shell-and-board-loading-states-wireframe-brief.md)
- Dependency memo: [`docs/ux-specs/board-shell-and-board-loading-states-frontend-dependency-exploration.md`](./board-shell-and-board-loading-states-frontend-dependency-exploration.md)

## 2. Dependency Decisions for This Brief

This brief assumes the approved path from the dependency memo:

- use `react-hook-form` for the create-board dialog form
- use `PrettyModalWrap` for the create-board dialog shell
- use existing Tamagui primitives for the protected shell, board list, and loading states
- do not install or use drag-and-drop, virtualization, toast, menu, drawer, or popover libraries in this slice

Supporting repo-level defaults remain recorded in [`docs/frontend-library-decisions.md`](../frontend-library-decisions.md).

## 3. Slice Goal

Build the first protected Kanban shell so a signed-in user can reach `/boards`, create a board, open an existing board, understand board loading and failure states, and see the auth reminder/sign-out behavior in stable shell locations.

## 4. Routes and Surfaces to Build

### Route: `/boards`

Responsibilities:

- render the protected shell header
- render the verification reminder banner below the header when required by the auth/session rules
- load the current user's boards
- render the boards-home loading, loaded, empty, and error states
- open the create-board dialog from the header or empty state

### Route: `/boards/$boardId`

Responsibilities:

- render the same protected shell header
- render the verification reminder banner below the header when applicable
- load the requested board with columns and cards
- render the board-detail loading, loaded, error, and not-available states
- keep already loaded board content visible during background refresh

### Shared protected-shell integration points

Responsibilities:

- visible header actions: `Create board`, `Board settings` when present on `/boards/$boardId`, `Sign out`
- dedicated polite live region for create, loading, and refresh announcements
- consistent placement for inherited auth reminder behavior

## 5. Component Responsibilities

### `ProtectedBoardsShell`

- shared layout for all `/boards*` routes
- header, banner slot, main-content slot, live-region anchor

### `BoardsShellHeader`

- renders `Kanban`, `Boards`, `Create board`, `Board settings` when present on `/boards/$boardId`, and `Sign out`
- stays mounted during route transitions inside `/boards*`

### `BoardsHomeScreen`

- route-level container for `/boards`
- chooses between loading, loaded-list, empty, and error states

### `BoardsList`

- renders boards ordered most recently updated first
- renders board summary text for each board entry

### `BoardsHomeEmptyState`

- no-boards heading, body, and `Create board` action

### `BoardsHomeErrorState`

- error heading, body, and `Retry` action

### `CreateBoardDialog`

- `react-hook-form` wiring for board name input
- validation and error display
- submit pending state
- success close and route transition

### `BoardDetailLoadingState`

- back link
- status text
- board header skeleton
- column/card placeholder skeletons

### `BoardDetailScreen`

- loaded board title and summary
- zero-card helper when total card count is `0`
- column sections
- background refresh status and refresh error handling

### `BoardColumnSection`

- column title
- card count text
- card tiles or empty-column text
- focusable region behavior for keyboard users

### `BoardDetailErrorState`

- retryable initial-load failure state

### `BoardNotAvailableState`

- neutral not-found / inaccessible state
- `Back to boards` and `Create board`

### `ProtectedBoardsLiveRegion`

- one polite live-region node for slice-level async announcements

## 6. State Ownership Expectations

### Firebase auth client state

- source of truth for current signed-in user
- source of truth for sign-out handling
- source of truth for whether the auth reminder banner should render at all, subject to the existing auth/session rules

### Local React state

- create-board dialog open or closed state
- inline create-board form display state that is not already owned by `react-hook-form`
- any transient local refresh-error display state tied to the currently loaded board view

### TanStack Query / mutation layer

- boards-home read
- board-detail read
- create-board mutation
- any background refetch behavior for the loaded board

### Redux

- do not introduce Redux for this slice
- do not move shell-open state, dialog state, list state, or form state into Redux
- revisit only if a later slice introduces true cross-feature client state that cannot stay local or query-owned

## 7. Query and Mutation Touchpoints Implied by the UX

- list current user's boards with column and card counts
- create board with name-only input and default starter columns
- get one board with ordered columns and ordered cards
- retry boards-home read
- retry board-detail read

The frontend brief does not define APIs. It only requires that these capabilities exist and produce the visible states documented in the UX spec.

## 8. Validation and Error Display Rules

- Use the exact validation and error strings from the canonical UX spec.
- Board name is trimmed before validation and submission.
- Inline field errors render beneath the field and are associated with `aria-describedby`.
- Form-level create failures render above the dialog actions.
- On validation failure, focus moves to the invalid field.
- On form-level failure without field errors, focus moves to the form-level error container.
- Preserve the entered board name after create-board failure.

## 9. Accessibility Acceptance Criteria

- The shell uses semantic header, nav, main, and dialog structure.
- Every header action and route-level action is keyboard-operable.
- The create-board dialog traps focus, closes on `Escape`, and restores focus to the invoking `Create board` button.
- The create-board field has a visible label.
- Loading, create, and refresh outcomes are announced through one polite live region.
- Column sections in loaded board detail are keyboard reachable as focusable regions.
- Skeleton placeholders are `aria-hidden`; the associated status text carries the accessible meaning.
- Color is never the only signal for loading, error, or empty states.

## 10. Responsive Acceptance Criteria

- The shell header wraps on narrow widths instead of causing horizontal scrolling.
- The `/boards` route remains a single vertical list on mobile and desktop.
- The `/boards/$boardId` route stacks columns vertically below 1024 px.
- The `/boards/$boardId` route shows side-by-side columns in a horizontally scrollable canvas at 1024 px and above.
- Empty and error-state actions stack vertically on narrow screens.
- The create-board dialog becomes full-width or full-screen on narrow screens.

## 11. Visual and Composition Constraints

- Use Tamagui-first composition.
- Prefer `Stack`, `XStack`, `YStack`, `Text`, `Button`, and `Input` over raw HTML where practical.
- Keep the protected shell clear and utilitarian rather than overdesigned.
- Do not imply drag handles, hidden card actions, or future filter controls that this slice does not define.
- The current `src/navigation/AppNav.tsx` is scaffolding and should not remain the long-term protected board shell once this slice is implemented.

## 12. Interaction Edge Cases

- `/boards` read succeeds with zero boards: show the empty state, not an empty blank list.
- `/boards` read fails: show the retryable error state while preserving the shell header.
- Create board is triggered from `/boards/$boardId`: on success, route directly to the new board.
- Board create succeeds but the new board's first read is slow: show the standard board-detail loading state.
- Board create succeeds but the new board's first read fails: show the board-detail error or not-available state according to the canonical rules.
- Board detail initial read fails: show the retryable error state, not stale content.
- Board detail background refetch fails after content already exists: preserve stale content and show inline refresh error feedback.
- Not-found and inaccessible board ids share the same neutral not-available copy.
- Verification reminder placement is stable across both board routes.

## 13. Implementation Guardrails

- Keep `/boards` as a real index route. Do not auto-redirect to a recent board in this slice.
- Keep card tiles read-only and non-activating in this slice.
- Keep the shell header stable across protected board routes.
- Use `react-hook-form` for the create-board form.
- Use `PrettyModalWrap` for the create-board dialog.
- Do not introduce Redux, drag-and-drop, virtualization, toast, or menu primitives for this slice.

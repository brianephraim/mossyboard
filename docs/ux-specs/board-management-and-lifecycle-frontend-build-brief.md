# Frontend Build Brief: Board Management and Lifecycle

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/board-management-and-lifecycle.md`](./board-management-and-lifecycle.md)
- Wireframe brief: [`docs/ux-specs/board-management-and-lifecycle-wireframe-brief.md`](./board-management-and-lifecycle-wireframe-brief.md)
- Dependency memo: [`docs/ux-specs/board-management-and-lifecycle-frontend-dependency-exploration.md`](./board-management-and-lifecycle-frontend-dependency-exploration.md)

## 2. Dependency Decisions for This Brief

- use `react-hook-form`
- use `PrettyModalWrap`
- keep post-delete feedback inline on `/boards`

## 3. Slice Goal

Build board rename and board delete behavior so users can manage the current board lifecycle without inventing dialog or navigation semantics.

## 4. Surfaces to Build

- board-settings entry point
- board settings dialog
- discard-changes confirmation
- delete-board confirmation
- `/boards` post-delete status message

## 5. Component Responsibilities

- `BoardSettingsTrigger`
- `BoardSettingsDialog`
- `DiscardBoardSettingsChangesDialog`
- `DeleteBoardDialog`
- `BoardsIndexStatusMessage`

## 6. State Ownership Expectations

- `react-hook-form` owns board rename form state
- local React state owns whether settings or confirmation dialogs are open
- TanStack Query / mutations own:
  - `board.rename`
  - `board.softDelete`
- route or transient UI state owns the one-time `/boards` post-delete message

## 7. Backend Touchpoints Implied by the UX

- `board.rename`
- `board.softDelete`

## 8. Accessibility Acceptance Criteria

- Settings and confirmation dialogs trap focus and restore focus on close.
- Rename field has a visible label.
- Success and failure states announce through a polite live region.
- Destructive state treatment is not color-only.

## 9. Responsive Acceptance Criteria

- Settings dialog becomes a full-width sheet or full-screen modal on narrow screens.
- Confirmation actions may stack vertically on narrow screens.
- `/boards` post-delete status remains visible near the top of the route.

## 10. Implementation Guardrails

- Rename uses explicit save.
- Delete requires a second confirmation dialog.
- Delete success always returns the user to `/boards`.
- Do not add restore or archive behavior in this slice.

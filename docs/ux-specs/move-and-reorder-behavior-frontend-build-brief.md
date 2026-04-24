# Frontend Build Brief: Move and Reorder Behavior

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/move-and-reorder-behavior.md`](./move-and-reorder-behavior.md)
- Wireframe brief: [`docs/ux-specs/move-and-reorder-behavior-wireframe-brief.md`](./move-and-reorder-behavior-wireframe-brief.md)
- Dependency memo: [`docs/ux-specs/move-and-reorder-behavior-frontend-dependency-exploration.md`](./move-and-reorder-behavior-frontend-dependency-exploration.md)

## 2. Dependency Decisions for This Brief

- use `@hello-pangea/dnd`
- keep explicit movement controls on current Tamagui primitives
- use `react-window` only if measured performance requires it
- do not add a separate motion library

## 3. Slice Goal

Build card and column movement so the board becomes meaningfully reorderable while staying accessible and conflict-safe.

## 4. Surfaces to Build

- card drag interactions
- card explicit move controls
- column drag interactions
- column explicit move controls
- board conflict recovery message

## 5. Component Responsibilities

- `BoardDragContext`
- `DraggableCard`
- `DraggableColumn`
- `CardMoveActions`
- `ColumnMoveActions`
- `BoardOrderConflictMessage`

## 6. State Ownership Expectations

- TanStack Query / mutations own:
  - `card.move`
  - `card.reorder`
  - `column.reorder`
- hand-written wrapper hooks may coordinate optimistic updates and rollback for this slice
- local React state owns drag-specific transient UI state
- Redux is not needed for server ordering data itself

## 7. Backend Touchpoints Implied by the UX

- `card.move`
- `card.reorder`
- `column.reorder`

## 8. Accessibility Acceptance Criteria

- Every drag interaction has a non-drag fallback.
- Movement boundaries expose semantic disabled state.
- Live-region announcements cover success and conflict outcomes.
- Drag handles and movement actions have accessible names.

## 9. Responsive Acceptance Criteria

- Explicit movement controls remain available on every viewport.
- Conflict recovery remains readable without obscuring the whole board on narrow screens.
- Drag affordances may adapt visually by viewport, but drag must never be the only path.

## 10. Implementation Guardrails

- Use optimistic UI with rollback on failure or conflict.
- Keep movement item-scoped; do not batch multiple card moves into one user action in this slice.
- Keep selected card detail coherent after same-board moves.
- Do not add undo to this slice.

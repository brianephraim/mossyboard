# Frontend Build Brief: Card Detail Panel or Modal

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/card-detail-panel-or-modal.md`](./card-detail-panel-or-modal.md)
- Wireframe brief: [`docs/ux-specs/card-detail-panel-or-modal-wireframe-brief.md`](./card-detail-panel-or-modal-wireframe-brief.md)
- Dependency memo: [`docs/ux-specs/card-detail-panel-or-modal-frontend-dependency-exploration.md`](./card-detail-panel-or-modal-frontend-dependency-exploration.md)
- Sibling field-behavior spec: [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md)

## 2. Dependency Decisions for This Brief

- reuse `react-hook-form` for the existing card field form region
- use `PrettyModalWrap` for modal detail presentation and blocking discard dialog reuse
- keep the desktop side panel on current Tamagui primitives
- do not add a drawer, sheet, or inspector library
- do not add DnD, virtualization, or toast infrastructure in this slice

## 3. Slice Goal

Build the route-driven card detail surface so users can inspect a card in context and manage subtasks without leaving the board route.

## 4. Surfaces to Build

- desktop card detail side panel
- mobile full-screen card detail modal
- card-detail loading state
- card-detail retryable-error state
- card-detail neutral not-available state
- subtask empty state
- subtask composer
- subtask row read state
- subtask row title-edit state

## 5. Component Responsibilities

- `CardDetailRouteState`
- `DesktopCardDetailPanel`
- `MobileCardDetailModal`
- `CardDetailLoadState`
- `CardDetailUnavailableState`
- `CardDetailErrorState`
- `CardDetailSubtasksSection`
- `SubtaskComposer`
- `SubtaskRow`

## 6. State Ownership Expectations

- TanStack Router search params own the selected card route state
- TanStack Query owns:
  - `card.get`
  - `subtask.create`
  - `subtask.update`
  - `subtask.toggle`
  - `subtask.softDelete`
- `react-hook-form` continues to own the sibling card field form state
- local React state owns:
  - whether the subtask composer is open
  - which subtask row is in title-edit mode
  - focus-return bookkeeping for close behavior
- Redux is not needed for this slice

## 7. Backend Touchpoints Implied by the UX

- `card.get`
- `subtask.create`
- `subtask.update`
- `subtask.toggle`
- `subtask.softDelete`
- existing card field behavior still depends on:
  - `card.update`
  - `card.softDelete`

## 8. Accessibility Acceptance Criteria

- Desktop panel has a clear heading, close control, and keyboard-reachable content order.
- Mobile modal traps focus, closes on `Escape`, and restores focus on close.
- Every subtask checkbox and row action has an accessible name.
- Live-region announcements cover detail load and subtask outcomes.
- Unsaved card or subtask text is intercepted by the existing discard dialog before loss.

## 9. Responsive Acceptance Criteria

- Desktop uses a right-side panel while preserving visible board context.
- Mobile uses a full-screen modal with a persistent close action.
- Subtask row actions may wrap or stack on narrow screens instead of overflowing horizontally.
- The detail surface remains one vertical content flow on mobile.

## 10. Implementation Guardrails

- The `card` search param is the source of truth for which card is open.
- Desktop card switching should reuse the same panel shell.
- Mobile does not need same-surface card switching while the modal is open.
- Do not invent comments, tags, attachments, or subtask reorder controls in this slice.
- Do not autosave subtask title edits.
- Do not silently discard unsaved card or subtask text.

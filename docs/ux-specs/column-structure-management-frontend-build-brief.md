# Frontend Build Brief: Column Structure Management

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/column-structure-management.md`](./column-structure-management.md)
- Wireframe brief: [`docs/ux-specs/column-structure-management-wireframe-brief.md`](./column-structure-management-wireframe-brief.md)
- Dependency memo: [`docs/ux-specs/column-structure-management-frontend-dependency-exploration.md`](./column-structure-management-frontend-dependency-exploration.md)

## 2. Dependency Decisions for This Brief

- use `react-hook-form`
- keep inline create and rename UI on current Tamagui primitives
- do not add DnD here

## 3. Slice Goal

Build the inline column create and rename behaviors so users can change board structure without leaving the loaded board.

## 4. Surfaces to Build

- board-end add-column trigger
- add-column composer
- column header overflow action entry points
- inline rename editor

## 5. Component Responsibilities

- `BoardEndAddColumnSlot`
- `InlineColumnComposer`
- `ColumnHeaderActions`
- `InlineColumnRenameEditor`

## 6. State Ownership Expectations

- `react-hook-form` owns the current create or rename form state
- local React state owns:
  - which create composer is open
  - which column rename editor is open
- TanStack Query / mutations own:
  - `column.create`
  - `column.rename`
- Redux is not needed for this slice

## 7. Backend Touchpoints Implied by the UX

- `column.create`
- `column.rename`

## 8. Accessibility Acceptance Criteria

- Create and rename flows are fully keyboard-operable.
- Inputs have visible labels.
- Success and failure states announce through the existing board live region.
- Overflow-menu actions that start create or rename flows remain keyboard-reachable.

## 9. Responsive Acceptance Criteria

- The board-end composer fits narrow mobile columns without clipping.
- Inline rename remains clearly attached to the current column header on all viewports.
- Action buttons may stack on narrow screens.

## 10. Implementation Guardrails

- Create remains title-only.
- Rename remains inline.
- No column delete or reorder controls appear in this slice.
- No blocking discard dialog is required for unsaved create or rename text.

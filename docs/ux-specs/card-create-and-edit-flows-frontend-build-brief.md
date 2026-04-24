# Frontend Build Brief: Card Create and Edit Flows

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md)
- Wireframe brief: [`docs/ux-specs/card-create-and-edit-flows-wireframe-brief.md`](./card-create-and-edit-flows-wireframe-brief.md)
- Dependency memo: [`docs/ux-specs/card-create-and-edit-flows-frontend-dependency-exploration.md`](./card-create-and-edit-flows-frontend-dependency-exploration.md)

## 2. Dependency Decisions for This Brief

- use `react-hook-form`
- use `PrettyModalWrap`
- keep priority on current Tamagui primitives
- do not use DnD in this slice

## 3. Slice Goal

Build the card create and field-edit behaviors so the board becomes meaningfully writable without yet introducing move/reorder complexity.

## 4. Surfaces to Build

- inline card composer per column
- empty-column create state
- card field form region inside the detail surface
- discard-changes dialog
- delete-card confirmation dialog

## 5. Component Responsibilities

- `ColumnAddCardTrigger`
- `InlineCardComposer`
- `EmptyColumnAddCardState`
- `CardFieldsForm`
- `DiscardCardChangesDialog`
- `DeleteCardDialog`

## 6. State Ownership Expectations

- `react-hook-form` owns create and edit form state
- local React state owns which column composer is currently open
- TanStack Query / mutations own:
  - card create
  - card update
  - card soft delete
- Redux is not needed for this slice

## 7. Backend Touchpoints Implied by the UX

- `card.create`
- `card.update`
- `card.softDelete`
- board read shapes must include `priority` once this slice ships

## 8. Accessibility Acceptance Criteria

- inline composer is keyboard-operable
- dialogs trap focus and restore focus on close
- field errors use `aria-describedby`
- success and failure states announce through the board live region

## 9. Responsive Acceptance Criteria

- inline composer fits inside narrow mobile columns
- dialogs stack actions vertically on narrow screens
- the field form works identically inside desktop panel and mobile modal containers

## 10. Implementation Guardrails

- create flow is title-first only
- edit flow uses explicit save
- do not silently discard dirty edits
- do not add autosave or undo in this slice

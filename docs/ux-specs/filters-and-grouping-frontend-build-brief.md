# Frontend Build Brief: Filters and Grouping

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/filters-and-grouping.md`](./filters-and-grouping.md)
- Wireframe brief: [`docs/ux-specs/filters-and-grouping-wireframe-brief.md`](./filters-and-grouping-wireframe-brief.md)
- Dependency memo: [`docs/ux-specs/filters-and-grouping-frontend-dependency-exploration.md`](./filters-and-grouping-frontend-dependency-exploration.md)

## 2. Dependency Decisions for This Brief

- stay within official Tamagui packages or primitives
- keep grouped board transformation client-side
- use TanStack Query pagination for list mode
- do not add a non-Tamagui filter library

## 3. Slice Goal

Build filter and grouping controls plus a paginated matching-cards list mode so users can inspect current-board work by priority.

## 4. Surfaces to Build

- filter controls
- view mode controls
- grouping control
- grouped board transformations
- matching-cards list view

## 5. Component Responsibilities

- `BoardFiltersControl`
- `BoardViewModeControl`
- `BoardGroupingControl`
- `PriorityGroupedBoardView`
- `MatchingCardsListView`

## 6. State Ownership Expectations

- route/search params own:
  - current view mode
  - current grouping
  - current active priority filters
- TanStack Query owns:
  - `board.getWithColumnsAndCards`
  - `card.listByBoard`
- local React state may own temporary open/closed state for the filter UI
- Redux is not needed for remote card data itself

## 7. Backend Touchpoints Implied by the UX

- `board.getWithColumnsAndCards` must expose `priority` on card summaries
- `card.listByBoard`

## 8. Accessibility Acceptance Criteria

- Filter, view, and grouping controls are keyboard-operable and expose selected state semantically.
- Loading, empty, and error states are explicit and not color-only.
- Filter and pagination updates announce through a polite live region.

## 9. Responsive Acceptance Criteria

- Filter controls can collapse into a compact menu or sheet on narrow screens.
- Grouped board view remains comprehensible on all viewports.
- List rows stack metadata vertically on narrow screens.

## 10. Implementation Guardrails

- Priority is the only filter and grouping attribute in this slice.
- Grouping applies only in board view.
- List view is flat and paginated.
- Do not add search or saved views in this slice.

# Frontend Dependency Exploration Memo: Card Detail Panel or Modal

## 1. Slice Name

Card detail panel or modal

Parent UX spec: [`docs/ux-specs/card-detail-panel-or-modal.md`](./card-detail-panel-or-modal.md)

## 2. Executive Summary

Recommended path for this slice:

- reuse `react-hook-form` for the sibling card field form already defined in the card-create-and-edit slice
- keep `PrettyModalWrap` for mobile full-screen modal presentation and any blocking discard dialog reuse
- build the desktop side panel from current Tamagui primitives and router state
- do not add a drawer, sheet, or inspector-panel dependency for this slice
- keep subtask create and row-edit interactions on current-stack primitives without adding another form library

## 3. Human Decision Checklist

- [x] Reuse `react-hook-form` for the shared card field form region
- [x] Keep `PrettyModalWrap` for modal flows
- [x] Keep the desktop panel on current Tamagui primitives plus route state
- [x] Keep subtask controls dependency-light
- [x] Defer DnD until move and reorder slices

## 4. Capability Evaluation

### Capability: Route-driven desktop side panel

- Why it matters:
  - desktop detail presentation is a right-side panel, not a separate page
  - switching cards should reuse the same surface shell
- Current-stack option:
  - TanStack Router search params plus existing Tamagui layout primitives
- Recommendation:
  - no new panel or drawer library
- Install timing:
  - `not needed`

### Capability: Mobile full-screen detail modal

- Why it matters:
  - mobile detail presentation blocks the board behind it
  - modal focus management must stay consistent with project conventions
- Current-stack option:
  - `PrettyModalWrap`
- Recommendation:
  - keep `PrettyModalWrap`
- Install timing:
  - `not needed`

### Capability: Card field form inside the detail surface

- Why it matters:
  - title, description, priority editing already depends on the sibling slice
- Recommendation:
  - reuse `react-hook-form`
- Install timing:
  - already chosen repo-wide for current documented slices

### Capability: Subtask create and row editing

- Why it matters:
  - add-subtask and rename-subtask need lightweight input state
- Current-stack option:
  - local React state or narrowly scoped existing form primitives
- Recommendation:
  - no extra form dependency for subtasks in this slice
- Install timing:
  - `not needed`

### Capability: Large subtask lists

- Why it matters:
  - not required by this slice's documented thresholds
- Recommendation:
  - no virtualization dependency in this slice
- Install timing:
  - `not needed`

### Capability: Reorder or drag interactions

- Why it matters:
  - explicitly out of scope here
- Recommendation:
  - defer to later move and reorder slices using the already chosen repo-level DnD path
- Install timing:
  - `later`

## 5. Final Recommendation

Implement this slice with:

- `react-hook-form` for the existing card field form region
- `PrettyModalWrap` for the mobile modal and blocking dialogs
- TanStack Router search-param state
- existing Tamagui primitives for the desktop panel and subtask rows
- no new panel, drawer, subtask, toast, motion, or virtualization dependency

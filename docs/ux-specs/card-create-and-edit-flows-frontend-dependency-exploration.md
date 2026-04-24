# Frontend Dependency Exploration Memo: Card Create and Edit Flows

## 1. Slice Name

Card create and edit flows

Parent UX spec: [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md)

## 2. Executive Summary

Recommended path for this slice:

- reuse `react-hook-form` for card create and edit forms
- keep `PrettyModalWrap` for discard and delete confirmations
- do not introduce a select library for priority in this slice
- do not introduce drag-and-drop in this slice

## 3. Human Decision Checklist

- [x] Reuse `react-hook-form`
- [x] Reuse `PrettyModalWrap`
- [x] Keep priority as a current-stack segmented choice, not a new select dependency
- [x] Defer DnD until move/reorder slices

## 4. Capability Evaluation

### Capability: Form state and validation

- Why it matters:
  - inline create form
  - card edit field form
- Recommendation:
  - use `react-hook-form`
- Install timing:
  - already chosen repo-wide for current documented slices

### Capability: Blocking confirmations

- Why it matters:
  - discard changes
  - delete card
- Recommendation:
  - use `PrettyModalWrap`
- Install timing:
  - `not needed`

### Capability: Priority selection control

- Why it matters:
  - the card edit form needs one fixed four-option field
- Current-stack option:
  - use current Tamagui primitives as a segmented button or radio-like group
- Recommendation:
  - no new select dependency in this slice
- Install timing:
  - `not needed`

### Capability: Drag-and-drop

- Why it matters:
  - not required by this slice
- Recommendation:
  - defer to later move/reorder work using the already chosen DnD path
- Install timing:
  - `later`

## 5. Final Recommendation

Implement this slice with:

- `react-hook-form`
- `PrettyModalWrap`
- existing Tamagui primitives
- no new select, DnD, toast, or motion dependency

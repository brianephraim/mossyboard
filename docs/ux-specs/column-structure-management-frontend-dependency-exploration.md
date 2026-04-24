# Frontend Dependency Exploration Memo: Column Structure Management

## 1. Slice Name

Column structure management

Parent UX spec: [`docs/ux-specs/column-structure-management.md`](./column-structure-management.md)

## 2. Executive Summary

Recommended path for this slice:

- reuse `react-hook-form` for the create and rename single-field forms
- keep all UI on current Tamagui primitives
- do not introduce a dedicated inline-edit or overflow-menu dependency in this slice
- do not introduce DnD here; reorder is handled in a separate slice

## 3. Human Decision Checklist

- [x] Reuse `react-hook-form`
- [x] Keep current Tamagui primitives for inline edit and composer shells
- [x] Defer DnD to the move/reorder slice

## 4. Capability Evaluation

### Capability: Single-field inline forms

- Why it matters:
  - create column
  - rename column
- Recommendation:
  - use `react-hook-form`
- Install timing:
  - already chosen repo-wide for current documented slices

### Capability: Overflow actions

- Why it matters:
  - `Add column after`
  - `Rename column`
- Recommendation:
  - stay on current Tamagui primitives or official Tamagui menu primitives when implemented
- Install timing:
  - no non-Tamagui dependency needed

### Capability: Drag and reorder

- Why it matters:
  - not required in this slice
- Recommendation:
  - defer to the dedicated move/reorder slice using the repo-approved DnD path

## 5. Final Recommendation

Implement this slice with:

- `react-hook-form`
- existing Tamagui primitives
- no new non-Tamagui dependency
- no DnD dependency in this slice

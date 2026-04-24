# Frontend Dependency Exploration Memo: Move and Reorder Behavior

## 1. Slice Name

Move and reorder behavior

Parent UX spec: [`docs/ux-specs/move-and-reorder-behavior.md`](./move-and-reorder-behavior.md)

## 2. Executive Summary

Recommended path for this slice:

- use `@hello-pangea/dnd` for card and column drag interactions
- keep non-drag fallback controls on current Tamagui primitives
- reserve `react-window` only if measured board scale requires virtualization during implementation
- do not add a separate motion library

## 3. Human Decision Checklist

- [x] Use `@hello-pangea/dnd`
- [x] Keep explicit move controls on current Tamagui primitives
- [x] Treat `react-window` as the future virtualization partner only if needed
- [x] Defer extra motion libraries

## 4. Capability Evaluation

### Capability: Drag and drop

- Why it matters:
  - card reorder
  - card move between columns
  - column reorder
- Recommendation:
  - use `@hello-pangea/dnd`

### Capability: Large-board virtualization

- Why it matters:
  - the repo already chose a future partner library
- Recommendation:
  - do not add virtualization by default
  - use `react-window` only if measured board size requires it

### Capability: Explicit non-drag movement controls

- Why it matters:
  - accessibility fallback
  - touch-first fallback
- Recommendation:
  - current Tamagui primitives are sufficient

### Capability: Extra motion

- Why it matters:
  - drag library already handles its own interaction animation
- Recommendation:
  - no additional motion dependency

## 5. Final Recommendation

Implement this slice with:

- `@hello-pangea/dnd`
- current Tamagui primitives for explicit movement controls
- `react-window` only if later performance testing requires it
- no extra motion library

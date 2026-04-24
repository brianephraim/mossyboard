# Frontend Dependency Exploration Memo: Filters and Grouping

## 1. Slice Name

Filters and grouping

Parent UX spec: [`docs/ux-specs/filters-and-grouping.md`](./filters-and-grouping.md)

## 2. Executive Summary

Recommended path for this slice:

- stay within official Tamagui packages or primitives for filter and view controls
- do not add a non-Tamagui filter library
- keep grouping client-side in board view
- use the server-backed paginated list only for list mode

## 3. Human Decision Checklist

- [x] Prefer official Tamagui packages or primitives
- [x] No non-Tamagui filter library
- [x] Keep board grouping client-side
- [x] Use backend pagination only for list mode

## 4. Capability Evaluation

### Capability: Filter controls

- Why it matters:
  - multi-select priority filters
- Recommendation:
  - use current Tamagui primitives or official Tamagui packages

### Capability: View and grouping controls

- Why it matters:
  - `Board view` / `List view`
  - `Group by`
- Recommendation:
  - current Tamagui primitives or official Tamagui packages are sufficient

### Capability: Grouped board transformation

- Why it matters:
  - priority grouping in board view
- Recommendation:
  - keep client-side using already loaded board data

### Capability: Paginated list mode

- Why it matters:
  - backend requirement for filtered list with pagination
- Recommendation:
  - use TanStack Query pagination around `card.listByBoard`

## 5. Final Recommendation

Implement this slice with:

- official Tamagui packages or primitives
- existing TanStack Query patterns
- no non-Tamagui filter dependency
- no server-shaped grouping endpoint in this slice

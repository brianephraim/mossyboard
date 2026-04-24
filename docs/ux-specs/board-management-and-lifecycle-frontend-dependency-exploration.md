# Frontend Dependency Exploration Memo: Board Management and Lifecycle

## 1. Slice Name

Board management and lifecycle

Parent UX spec: [`docs/ux-specs/board-management-and-lifecycle.md`](./board-management-and-lifecycle.md)

## 2. Executive Summary

Recommended path for this slice:

- reuse `react-hook-form` for board rename form state
- use `PrettyModalWrap` for the settings dialog and delete confirmation
- keep post-delete status messaging inline on `/boards`
- do not add a separate settings-route dependency

## 3. Human Decision Checklist

- [x] Reuse `react-hook-form`
- [x] Use `PrettyModalWrap`
- [x] Keep post-delete feedback inline rather than toast-based

## 4. Capability Evaluation

### Capability: Rename form

- Why it matters:
  - board rename uses explicit save
- Recommendation:
  - use `react-hook-form`

### Capability: Settings and confirmation dialogs

- Why it matters:
  - board settings
  - discard confirmation
  - delete confirmation
- Recommendation:
  - use `PrettyModalWrap`

### Capability: Post-delete confirmation

- Why it matters:
  - there is no repo-approved toast layer yet
- Recommendation:
  - keep a route-local inline status on `/boards`

## 5. Final Recommendation

Implement this slice with:

- `react-hook-form`
- `PrettyModalWrap`
- existing Tamagui primitives
- no toast dependency

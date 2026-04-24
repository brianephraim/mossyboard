# Readiness Audit: Move and Reorder Behavior

## 1. Inputs Audited

- Canonical UX spec: [`docs/ux-specs/move-and-reorder-behavior.md`](./move-and-reorder-behavior.md)
- Wireframe brief: [`docs/ux-specs/move-and-reorder-behavior-wireframe-brief.md`](./move-and-reorder-behavior-wireframe-brief.md)
- Frontend dependency exploration memo: [`docs/ux-specs/move-and-reorder-behavior-frontend-dependency-exploration.md`](./move-and-reorder-behavior-frontend-dependency-exploration.md)
- Frontend build brief: [`docs/ux-specs/move-and-reorder-behavior-frontend-build-brief.md`](./move-and-reorder-behavior-frontend-build-brief.md)
- Backend build brief: [`docs/ux-specs/move-and-reorder-behavior-backend-build-brief.md`](./move-and-reorder-behavior-backend-build-brief.md)
- Open questions log: [`docs/ux-specs/move-and-reorder-behavior-open-questions.md`](./move-and-reorder-behavior-open-questions.md)

## 2. Blocking Issues

- none

## 3. Non-Blocking Open Questions

### Product ambiguity

- Touch-first mobile emphasis between drag and explicit move actions remains intentionally open.
- Undo remains intentionally deferred.

### Frontend ambiguity

- The exact visual style of drag handles and drop targets is open for design exploration.

### Backend ambiguity

- Lazy key rebalance remains an implementation concern, not a UX ambiguity.

### Missing state coverage

- none found for the documented move and reorder slice

### Conflicting assumptions

- none found across the audited documents

## 4. Readiness Verdict

Ready for implementation of card move, card reorder, and column reorder behavior with the current documented assumptions.

The package is concrete enough for:

- a wireframe/design agent to produce movement and rollback states without inventing behavior
- a frontend agent to build drag and explicit movement controls without inventing major UX rules
- a backend agent to implement `card.move`, `card.reorder`, and `column.reorder` without inventing conflict or rollback semantics

## 5. Remaining Follow-Up Before Coding Starts

- Keep subtask reorder and undo out of this implementation pass
- Reuse the existing board live region and inline recovery UI rather than introducing toast infrastructure

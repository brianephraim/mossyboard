# Readiness Audit: Card Detail Panel or Modal

## 1. Inputs Audited

- Canonical UX spec: [`docs/ux-specs/card-detail-panel-or-modal.md`](./card-detail-panel-or-modal.md)
- Wireframe brief: [`docs/ux-specs/card-detail-panel-or-modal-wireframe-brief.md`](./card-detail-panel-or-modal-wireframe-brief.md)
- Frontend dependency exploration memo: [`docs/ux-specs/card-detail-panel-or-modal-frontend-dependency-exploration.md`](./card-detail-panel-or-modal-frontend-dependency-exploration.md)
- Frontend build brief: [`docs/ux-specs/card-detail-panel-or-modal-frontend-build-brief.md`](./card-detail-panel-or-modal-frontend-build-brief.md)
- Backend build brief: [`docs/ux-specs/card-detail-panel-or-modal-backend-build-brief.md`](./card-detail-panel-or-modal-backend-build-brief.md)
- Open questions log: [`docs/ux-specs/card-detail-panel-or-modal-open-questions.md`](./card-detail-panel-or-modal-open-questions.md)
- Sibling card field-behavior spec: [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md)

## 2. Blocking Issues

- none

## 3. Non-Blocking Open Questions

### Product ambiguity

- The long-term placement of completed subtasks remains intentionally open; this slice keeps them inline.
- Future detail features beyond subtasks remain intentionally open; this slice avoids inventing tabs or secondary sections.

### Frontend ambiguity

- The exact visual density of the desktop side panel remains open for design exploration.
- The exact sticky-header treatment on mobile may vary as long as the close control remains persistently available.

### Backend ambiguity

- This slice is concrete for `card.get` plus subtask CRUD-like mutations, but it intentionally leaves subtask reorder for a later slice.

### Missing state coverage

- none found for the documented detail-surface slice

### Conflicting assumptions

- none found across the audited documents once the sibling card field behavior is treated as authoritative for save/delete/discard rules

## 4. Readiness Verdict

Ready for implementation of the route-driven card detail surface and the first subtask detail feature with the current documented assumptions.

The package is concrete enough for:

- a wireframe/design agent to produce desktop and mobile detail-surface wireframes without inventing routing or state behavior
- a frontend agent to build the panel, modal, loading/error states, and subtask interactions without inventing major UX rules
- a backend agent to add `card.get`, `card_subtasks`, and the first subtask procedures without inventing user-visible outcomes

## 5. Remaining Follow-Up Before Coding Starts

- Land the sibling card-core backend work if it is not already present:
  - `cards.priority`
  - `card.update`
  - `card.softDelete`
- Add `card_subtasks` and `card.get` before wiring the detail surface
- Keep comments, tags, attachments, and subtask reorder out of this implementation pass

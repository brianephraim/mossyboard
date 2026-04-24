## UX Specs Index

Each feature slice has a consistent set of artifacts. Use this index to jump straight to the slice you need instead of scanning filenames.

For every slice the artifact pattern is:

- `<slice>.md` — canonical UX spec
- `<slice>-wireframe-brief.md` — wireframe brief
- `<slice>-frontend-dependency-exploration.md` — frontend dependency memo
- `<slice>-frontend-build-brief.md` — frontend implementation brief
- `<slice>-backend-build-brief.md` — backend implementation brief
- `<slice>-open-questions.md` — open-questions log
- `<slice>-readiness-audit.md` — readiness audit

If a new slice is added, create the same seven files and add it to the list below.

### Slices

- [`auth-session-boundaries`](./auth-session-boundaries.md) — signed-out landing, `/auth`, `/verify-email`, session recovery
- [`board-management-and-lifecycle`](./board-management-and-lifecycle.md) — `/boards`, board create/rename/delete, post-delete state
- [`board-shell-and-board-loading-states`](./board-shell-and-board-loading-states.md) — protected board shell, header, loading/empty/error states
- [`card-create-and-edit-flows`](./card-create-and-edit-flows.md) — add card per column, create composer, field validation
- [`card-detail-panel-or-modal`](./card-detail-panel-or-modal.md) — route-driven card detail panel / mobile full-screen modal
- [`column-structure-management`](./column-structure-management.md) — add column, add-column-after, inline column rename
- [`filters-and-grouping`](./filters-and-grouping.md) — filter controls, group-by, board/list view switch
- [`move-and-reorder-behavior`](./move-and-reorder-behavior.md) — card/column drag, non-drag move, optimistic recovery

### Reference

- [`mockup.png`](./mockup.png) — visual reference for the board

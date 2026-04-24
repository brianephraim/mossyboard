# Frontend Library Decisions

This document records engineer-approved frontend library choices so they are not left implicit in slice-specific UX docs or implementation work.

These are the current defaults unless a later slice documents a deliberate override.

## Approved Decisions

### Auth and session boundaries

- Forms: `react-hook-form`
- Auth mode switch between `signin` and `signup`: `@tamagui/tabs`

Notes:

- These choices were made after the auth/session dependency review for [`docs/ux-specs/auth-session-boundaries.md`](./ux-specs/auth-session-boundaries.md).
- Keep the auth route URL as the source of truth even if tabs are used for presentation.

### Drag-and-drop for cards and columns

- Drag-and-drop library: `@hello-pangea/dnd`

Notes:

- Upstream repo: [hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- Chosen for future card and column move/reorder work.
- The repo advertises accessible list-focused drag and drop with keyboard support and virtual-list support.

### Virtualized board and list rendering

- Virtualization partner for `@hello-pangea/dnd` board/list work: `react-window`

Notes:

- This decision follows the `@hello-pangea/dnd` virtual-list example approach.
- Treat `react-window` as the default partner library when board or list scale requires virtualization.

### Complex selects, comboboxes, and filter menus

- Prefer official Tamagui packages

### Toasts, undo notifications, and transient status UI

- Prefer official Tamagui packages

### Additional motion libraries

- Defer

Notes:

- Do not add a separate motion library by default.
- Let `@hello-pangea/dnd` own drag-related interaction and animation behavior for its flows.
- Revisit only when a later slice needs non-trivial animation beyond Tamagui and DnD behavior.

## Still Open

- Exact Tamagui package choices for future complex selects/comboboxes/filter menus
- Exact Tamagui package choices for future toasts/undo UI
- Whether any later slice needs a dedicated motion library beyond the current stack

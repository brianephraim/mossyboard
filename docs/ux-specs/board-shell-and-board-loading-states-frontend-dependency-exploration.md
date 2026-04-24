# Frontend Dependency Exploration Memo: Board Shell and Board Loading States

## 1. Slice Name

Board shell and board loading states

Parent UX spec: [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md)

## 2. Executive Summary

Engineer-approved direction for this slice:

- use `react-hook-form` for the create-board dialog form
- keep `PrettyModalWrap` as the dialog foundation
- do not introduce drag-and-drop, virtualization, toast, or complex menu libraries in this slice
- keep using Tamagui primitives for the shell, board list, and loading states

Related repo-level defaults remain recorded in [`docs/frontend-library-decisions.md`](../frontend-library-decisions.md), including:

- auth forms: `react-hook-form`
- auth mode switch: `@tamagui/tabs`
- future drag-and-drop: `@hello-pangea/dnd`
- future virtualization partner: `react-window`
- future complex selects / comboboxes / filter menus: prefer official Tamagui packages
- future toasts / transient status UI: prefer official Tamagui packages

## 3. Human Decision Checklist

- [x] Reuse `react-hook-form` for the create-board dialog
- [x] Keep `PrettyModalWrap` for this slice's dialog work
- [x] Defer `@hello-pangea/dnd` until move/reorder slices
- [x] Defer `react-window` until a later scale/performance slice actually needs it
- [x] Avoid adding a menu, drawer, toast, or command-palette library in this slice

## 4. Option Status Snapshot

### Approved

- `react-hook-form`
- `PrettyModalWrap`
- current Tamagui primitives for the protected shell

### Deferred

- `@hello-pangea/dnd`
- `react-window`
- official Tamagui menu / popover / toast add-ons
- any extra animation library

### Rejected for this slice

- any new drag-and-drop package install now
- any new virtualization package install now
- any new toast package install now
- any new drawer, command-menu, or popover dependency install now

## 5. Capability Evaluation

### Capability: Drag-and-drop / sortable interactions

#### Why the UX creates this dependency question

The board surface visually resembles future Kanban move/reorder work, so the slice could tempt a coding agent to install sortable infrastructure early.

#### Current-stack option

Do not implement drag or reorder in this slice. Render read-only board content only.

#### Candidate library options

- repo-approved future option: `@hello-pangea/dnd`

#### Accessibility and keyboard analysis

- Deferring drag behavior is safer than introducing half-specified keyboard drag semantics early.
- This slice already defines keyboard reachability through shell controls, list entries, dialog controls, and focusable column regions.

#### Mobile and responsiveness analysis

- Deferring drag avoids premature touch-interaction complexity on mobile.

#### Testing and maintenance analysis

- Avoids installing and testing a high-complexity library before the move/reorder slice exists.

#### Recommendation

Do not install or use a drag-and-drop library in this slice.

#### Human decision required

Decision already recorded: use `@hello-pangea/dnd` later for move/reorder work.

#### Install timing

`later`

### Capability: Form state + validation handling

#### Why the UX creates this dependency question

The create-board dialog has a real form with validation, pending state, focus movement, and server error mapping.

#### Current-stack option

Use local React state for the one field and hand-roll validation/display behavior.

#### Candidate library options

1. `react-hook-form`
2. current-stack local React state

#### Accessibility and keyboard analysis

- Neither option removes the need to explicitly implement labels, error associations, focus movement, and dialog semantics.
- `react-hook-form` is already the engineer-approved direction from the auth slice, which reduces variation across product forms.

#### Mobile and responsiveness analysis

- Both options work on mobile.
- The choice is mainly about consistency and maintainability, not responsiveness.

#### Testing and maintenance analysis

- Reusing `react-hook-form` avoids inventing a second form pattern for a similarly small form.
- Tests can stay user-behavior-focused with `@testing-library/react`.

#### Recommendation

Use `react-hook-form` for the create-board dialog.

#### Human decision required

Decision recorded: `react-hook-form`

#### Install timing

`now when this slice is implemented`

### Capability: Dialog / modal foundation

#### Why the UX creates this dependency question

The create-board entry point is a blocking modal dialog that needs proper focus trapping and return focus behavior.

#### Current-stack option

Use `src/Modal/PrettyModalWrap.tsx`.

#### Candidate library options

1. `PrettyModalWrap`
2. external dialog library

#### Accessibility and keyboard analysis

- The repo already requires `PrettyModalWrap` for blocking dialog flows.
- Adding another dialog primitive would create inconsistent modal behavior and duplicate accessibility work.

#### Mobile and responsiveness analysis

- `PrettyModalWrap` can support the mobile sheet/full-screen treatment required by the UX.

#### Testing and maintenance analysis

- Reusing the repo-standard dialog wrapper lowers risk.

#### Recommendation

Keep `PrettyModalWrap` as the dialog foundation for this slice.

#### Human decision required

Decision recorded: `PrettyModalWrap`

#### Install timing

`not needed`

### Capability: Menu / drawer / board-switcher primitives

#### Why the UX creates this dependency question

Protected shells often introduce account menus, board switchers, drawers, or popovers.

#### Current-stack option

Avoid those primitives entirely in this slice:

- `Sign out` is a visible header action
- board switching happens through the `/boards` route

#### Candidate library options

- current Tamagui primitives only
- official Tamagui menu/popover packages later if a future slice really needs them

#### Accessibility and keyboard analysis

- Avoiding a menu or drawer eliminates extra trap/focus complexity for now.
- The shell stays keyboard-clear with visible actions and direct routing.

#### Mobile and responsiveness analysis

- The `/boards` route works on mobile without a dedicated drawer or switcher library.

#### Testing and maintenance analysis

- Fewer shell primitives means less incidental complexity in the first protected-board milestone.

#### Recommendation

Do not add a menu, drawer, or popover package in this slice.

#### Human decision required

Approve deferring these packages until a later shell or account-management slice needs them.

#### Install timing

`not needed`

### Capability: Virtualization / large-board performance helpers

#### Why the UX creates this dependency question

The slice renders boards with columns and cards, which could suggest early virtualization.

#### Current-stack option

No virtualization in this slice.

#### Candidate library options

- repo-approved future option: `react-window`

#### Accessibility and keyboard analysis

- Deferring virtualization avoids introducing extra focus-management edge cases before DnD and larger-scale board behavior are specified together.

#### Mobile and responsiveness analysis

- Stacked mobile columns in this slice reduce immediate scale pressure.

#### Testing and maintenance analysis

- Avoids premature complexity and keeps the read-only board shell straightforward to test.

#### Recommendation

Do not add virtualization in this slice.

#### Human decision required

Decision already recorded: use `react-window` later if board/list scale requires it.

#### Install timing

`later`

## 6. Final Recommendation

This slice should be implemented with:

- `react-hook-form` for the create-board dialog
- `PrettyModalWrap` for the dialog shell
- existing Tamagui primitives for layout and loading states
- no new DnD, virtualization, menu, toast, or animation dependency installs

## 7. Implementation Notes

- `@tamagui/tabs` remains an approved repo dependency choice from auth, but this slice does not need a tab-like surface.
- The biggest dependency risk in this slice is not missing a library; it is overbuilding the protected shell before later card and reorder specs exist.

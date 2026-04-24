## Session 04: Inline Column Rename

### Session goal

Replace the current modal-based column rename with the inline rename experience described in the column-structure spec, preserving keyboard operability and optimistic/conflict behavior.

### Pre-read

- [`docs/ux-specs/column-structure-management.md`](../ux-specs/column-structure-management.md)
- [`docs/ux-specs/column-structure-management-frontend-build-brief.md`](../ux-specs/column-structure-management-frontend-build-brief.md)
- [`docs/ux-specs/column-structure-management-wireframe-brief.md`](../ux-specs/column-structure-management-wireframe-brief.md)
- Current rename implementation — locate via `rg -n "column.*rename|RenameColumn|renameColumn" src`
- [`AGENTS.md`](../../AGENTS.md) — accessibility and Tamagui rules

### Preconditions

- Sessions 01–03 landed, or at least Session 01. The rename UI can be replaced without the other sessions, but tests from Session 03 make regressions easier to catch.
- Working tree clean.

### Checklist

#### Implementation

- [ ] Remove the modal-based rename entry point on columns
- [ ] Add an inline rename affordance on the column header that enters edit mode
- [ ] Edit mode renders a Tamagui `Input` pre-filled with the current name
- [ ] Save commits on `Enter` and on blur outside the pending state
- [ ] Cancel reverts on `Esc` and restores focus to the column header trigger
- [ ] Explicit save and cancel controls are visible for pointer users
- [ ] Pending save disables rename controls without losing focus
- [ ] Optimistic update applies the new name locally and rolls back on failure
- [ ] Version-mismatch conflict recovers through the existing board-conflict path, not a bespoke dialog

#### Accessibility

- [ ] Inline input has a visible or `aria-label` label
- [ ] Enter, Esc, Tab, Shift+Tab behave as expected
- [ ] Focus returns to the column header trigger after save/cancel
- [ ] Screen-reader announcement for rename success goes through the existing `AuthLiveRegion` or the board’s live region

#### Cleanup

- [ ] Delete any now-unused rename modal components
- [ ] Update the matching checkbox in [`docs/kanban-frontend-implementation-checklist.md`](../kanban-frontend-implementation-checklist.md) — section 6 `Build inline column rename flow`
- [ ] Update the mention in [`docs/kanban-next-steps.md`](../kanban-next-steps.md) if it still references the modal rename

### Verification

- `npm run test`
- `npm run build`
- `npx prettier --write` on every file touched
- Manual browser pass:
  - inline rename save + cancel behaves correctly
  - keyboard-only rename works
  - simulated save failure rolls back
  - version-conflict path matches the rest of the board’s conflict recovery

### Commit points

- `refactor: replace column rename modal with inline rename`
- `test: cover inline column rename interactions` (if you add tests; otherwise fold into the refactor commit)
- `docs: check off inline column rename`

Keep each commit green.

### Out of scope

- Any column create/delete/reorder changes
- Other board polish
- Introducing a new column settings surface

### Definition of done

Column rename is inline, keyboard-operable, survives optimistic failure correctly, the modal code path is deleted, the frontend checklist reflects completion, and tests cover save + cancel.

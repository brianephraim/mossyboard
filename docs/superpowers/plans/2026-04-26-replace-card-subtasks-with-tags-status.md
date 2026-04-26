# Replace Card Subtasks With Tags — Final Status Report

**Plan:** [docs/superpowers/plans/2026-04-26-replace-card-subtasks-with-tags.md](./2026-04-26-replace-card-subtasks-with-tags.md)

**Spec:** [docs/superpowers/specs/2026-04-26-replace-card-subtasks-with-tags-design.md](../specs/2026-04-26-replace-card-subtasks-with-tags-design.md)

**Status:** All 15 tasks complete. Manual-verification (browser) checkboxes are intentionally not ticked because this run was non-interactive; they are listed under "Deviations" below for the human reviewer to exercise before merging.

---

## Commit hashes by task

Pre-work HEAD: `0c7b526` (the demolition commit was the first new work created during Task 1; everything before that hash is unrelated).

| Task                                  | Commit(s)                       | Title                                                                                                                                                                   |
| ------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Demolition                        | `0c7b526`, `7478ac3`            | refactor(boards): remove subtasks feature ahead of tags rewrite — plus plan-progress commit                                                                             |
| 2 — Schema + migration                | `8561b19`                       | feat(db): add tags and card_tags tables with RLS deny-all                                                                                                               |
| 3 — Repo + service                    | `2ca1a56`                       | feat(server): add tag repo, service, and shared helpers                                                                                                                 |
| 4 — TDD repo suite                    | `ef95e68`                       | test(tag): cover repo CRUD, casing rewrite, caps, owner scoping                                                                                                         |
| 5 — tRPC router + hydration + cascade | `f347097`, `640fb4f`, `10c7a12` | feat(server): wire tagRouter into appRouter / hydrate tags on card reads and cascade soft-deletes / test(server): cover tag hydration, listByBoard filter, and cascades |
| 6 — Types + model + tests             | `8ab7ab3`, `ec12a02`            | feat(boards): add tags to BoardDetailSearch, lane filter, reorder gate / test(boards): cover tag filter parsers, lane filter, reorder gate                              |
| 7 — Tamagui swatch tokens             | `06fce2b`                       | feat(tamagui): add 8 tag swatch token pairs (light + dark)                                                                                                              |
| 8 — tagPalette + TDD                  | `6fe5b94`                       | feat(boards): add tagPalette helper with FNV-1a swatch lookup                                                                                                           |
| 9 — useDragSafePress                  | `2447b6d`                       | refactor(boards): extract priority popover gesture into useDragSafePress                                                                                                |
| 10 — CardTagsRow + TDD                | `776cf63`                       | feat(boards): add CardTagsRow component with popover-based add and pill detach                                                                                          |
| 11 — Wire CardTagsRow + fan-out       | `2bb9632`                       | feat(boards): wire CardTagsRow into CardInterior and propagate tag props                                                                                                |
| 12 — useTagMutations + screens        | `355b838`, `3e117e4`            | feat(boards): load tag.list and wire useTagMutations into board screens / plan update                                                                                   |
| 13 — Tags panel in CardDetailSurface  | `05ebc0f`                       | feat(boards): mirror CardTagsRow inside the card detail modal                                                                                                           |
| 14 — Drawer Tags filter               | `ce3f7eb`                       | feat(boards): add Tags filter section to BoardDrawer                                                                                                                    |
| 15 — Touch-up + verification          | `c8ac3ac`                       | docs: align prose with subtasks → tags rewrite                                                                                                                          |

Range for review: `git log --oneline 0c7b526^..HEAD`

---

## Final verification

| Check                                  | Status                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                    | clean                                                                                            |
| `npm run test`                         | 128 tests / 37 files green                                                                       |
| `npm run lint`                         | 2 errors + 7 warnings, all **pre-existing** (verified via `git blame`) — see Deviations          |
| `npx prettier --check` (touched files) | clean                                                                                            |
| `rg "subtask" src/`                    | zero hits                                                                                        |
| `rg "subtask" docs/`                   | matches only historical UX specs / requirements menu / pre-rewrite plan files (verified by hand) |

---

## Deviations from the plan

1. **Manual browser-verification checkboxes left unticked.** Steps 12.6, 13.6, 14.6, 15.6 require running the dev server and clicking through the UI. This run was non-interactive, so those boxes are intentionally left unticked. The human reviewer should exercise these before merge — the underlying code paths are exercised by automated tests, but a real-browser smoke is still warranted per the plan.
2. **`drizzle-kit generate` interactive prompt (Task 2).** `drizzle-kit` requires a TTY for the "drop or rename" prompt. Resolved by driving the prompt through an `expect(1)` script. No deviation from the resulting migration content.
3. **`psql` not available on host (Task 2 verification).** Substituted a small Node script (using the existing pg client) to confirm `tags` and `card_tags` were created with the expected RLS rows. Functional outcome identical.
4. **Prettier does not format SQL.** `npx prettier --write` on the generated `.sql` migration is a no-op; documented and skipped.
5. **`@testing-library/user-event` not installed (Task 10).** Project uses `fireEvent` for component tests. Refactored `BoardCanvas.tag-row.test.tsx` to use `fireEvent` instead of `userEvent`, matching the rest of the suite.
6. **`@testing-library/jest-dom` matchers not installed.** Replaced `.toBeInTheDocument()` / `.toBeDisabled()` in new tests with native assertions (`not.toBeNull()`, `(el as HTMLButtonElement).disabled`).
7. **Postgres `ANY(...)` binding (Task 5).** Initial `ANY(${input.tags})` bound the JS array as a tuple. Switched to Drizzle's `inArray(...)` inside an `EXISTS` subquery; functional behavior matches the spec.
8. **Pre-existing lint errors (Task 15 Step 5).** `npm run lint` reports two errors that pre-date this rewrite:
   - `src/features/boards/BoardShell.tsx:52` — unused `columnCount` arg (introduced 2026-04-25 in a prior commit).
   - `src/form/FormInlineAutoGrowTextAreaField.tsx:48` — unused `clamp` helper (introduced earlier on 2026-04-26).

   Per AGENTS.md ("Only fix pre-existing lints if necessary") these are out of scope. They are flagged here so the reviewer can address them separately. One genuinely new unused import (`asc` in `src/server/card/repo.ts`, introduced during Task 5) was removed in Task 15.

9. **Drawer pattern note (Task 14 Step 1).** The plan suggested copying the existing Priority filter section from `BoardDrawer.tsx`. The Priority filter actually lives in `BoardPane.tsx` (`BoardControls`); the new Tags section was implemented inside `BoardDrawer.tsx` per the spec's "drawer-only" intent for tag filtering, so the drawer now has its own filter section that does not duplicate priority controls.
10. **Flaky test observed (Task 14).** `src/server/tag/repo.test.ts` "enforces per-card cap" timed out once during a full-suite run; passed on retry and on subsequent full-suite runs. No code change made — flagged as flaky for monitoring.

---

## What the human reviewer still needs to do

- Step through the manual-verification scenarios from Tasks 12, 13, 14, and 15 (Step 6 each):
  - Add a tag from a card on the board canvas, confirm casing-rewrite and pill detach.
  - Open card-detail modal and confirm the tag panel mirrors the canvas.
  - Open the drawer, click a tag chip, confirm URL `?tags=…` updates and cards filter; reorder is disabled while filter is active; Clear removes the filter.
  - Soft-delete a card and confirm the tag survives in the master list (master tag list is account-scoped, not card-scoped).
- Decide whether the two pre-existing lint errors should be cleaned up in a follow-up.

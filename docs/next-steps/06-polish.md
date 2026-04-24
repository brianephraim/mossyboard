## Session 06: Visual and Interaction Polish

### Session goal

Bring the board UI closer to the mockup and raise the quality bar on loading/empty states, filter/group visuals, conflict/success feedback, and mobile ergonomics. Only run after Sessions 01–05 have landed.

### Pre-read

- [`docs/ux-specs/mockup.png`](../ux-specs/mockup.png)
- [`docs/ux-specs/board-shell-and-board-loading-states.md`](../ux-specs/board-shell-and-board-loading-states.md)
- [`docs/ux-specs/filters-and-grouping.md`](../ux-specs/filters-and-grouping.md)
- [`docs/ux-specs/card-detail-panel-or-modal.md`](../ux-specs/card-detail-panel-or-modal.md)
- [`AGENTS.md`](../../AGENTS.md) — Tamagui and a11y rules, including `prefers-reduced-motion`

### Preconditions

- Sessions 01–05 landed.
- No outstanding blockers in [`docs/kanban-frontend-implementation-blockers.md`](../kanban-frontend-implementation-blockers.md) if it exists.
- Working tree clean.

### Checklist

#### Layout and typography

- [ ] Audit spacing + typography against [`mockup.png`](../ux-specs/mockup.png); adjust with Tamagui tokens, not inline styles
- [ ] Confirm no raw HTML elements (`div`, `span`, etc.) were introduced; convert stragglers to Tamagui primitives

#### Loading, empty, error

- [ ] Replace bare spinners or text with the loading placeholders described in the shell spec
- [ ] Improve the empty-board state (no columns yet) and empty-column state
- [ ] Give error/not-found states deliberate visuals, not default text

#### Filters and grouping

- [ ] Active filter chips have a clear selected state
- [ ] Grouped-board view clearly differentiates groups
- [ ] List view headers and pagination controls read cleanly

#### Feedback

- [ ] Conflict recovery surfaces an unmistakable banner or toast, not only a subtle inline message
- [ ] Successful saves announce through the existing polite live region
- [ ] Destructive actions look destructive

#### Motion

- [ ] Board drag preview animation is smooth
- [ ] Any non-trivial animation respects `prefers-reduced-motion`

#### Mobile ergonomics

- [ ] Card-detail full-screen modal has adequate tap targets
- [ ] Board canvas scrolls horizontally with clear visual affordance, not only by convention
- [ ] Inputs do not trigger OS autozoom (font-size ≥ 16px)

### Verification

- `npm run test`
- `npm run build`
- `npx prettier --write` on every file touched
- Manual browser pass:
  - desktop + 375px width smoke test
  - visual diff against [`mockup.png`](../ux-specs/mockup.png)
  - reduced-motion preference verified in OS settings

### Commit points

Polish invites accidental scope creep. Keep commits thematic:

- `refactor: align board spacing with mockup`
- `feat: stronger loading and empty states`
- `feat: clearer selected filter treatment`
- `fix: respect prefers-reduced-motion on board animations`
- `refactor: tighten mobile card detail ergonomics`

Every commit must leave the tree green.

### Out of scope

- New product behavior
- Any changes to the backend
- Refactors that expand into unrelated components

### Definition of done

The board looks deliberate against the mockup at both desktop and 375px widths, loading/empty/error states feel designed, filter/group UI has a clear selected state, conflict/success feedback is visible, and reduced-motion preferences are respected. Tests and build are green.

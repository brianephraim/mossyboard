## Session 05: Reduce Board-Route Bundle Weight

### Session goal

Cut the client chunk warning emitted on `npm run build` by keeping board-only code off the auth and non-board routes. Not a blocker, but the easiest measurable technical-cleanup win from the current build output.

### Pre-read

- [`AGENTS.md`](../../AGENTS.md) — file-size and abstraction guardrails
- `npm run build` output — capture the current warning and size before changing anything
- Board entry points — typically `src/routes/boards.tsx`, `src/routes/boards.$boardId.tsx`
- Anything large imported eagerly by the board: drag-and-drop, modal, filter, list components

### Preconditions

- Sessions 01 and at minimum 02 landed.
- `npm run build` currently succeeds but emits a chunk-size warning.
- No in-flight work on the board routes.

### Checklist

#### Measure first

- [ ] Record baseline bundle output (`npm run build`) and note the largest chunk sizes + the warning threshold
- [ ] Identify the heaviest board-only dependencies (DnD, filter, list view, card detail) via the build output and quick `rg` passes

#### Split heavy code off non-board routes

- [ ] Keep top-level route entries lean; push heavy composition into child components imported by the board route only
- [ ] Lazy-load the list view or card-detail modal if they are not needed on initial board render
- [ ] Ensure `@hello-pangea/dnd` is only imported from the board route’s component tree
- [ ] Ensure card detail, board settings, and delete-confirmation modals do not pull into the auth route bundle

#### Guardrails

- [ ] Do not add route-level code splitting to auth routes (small, already cheap)
- [ ] Do not introduce dynamic imports inside render paths that run on every interaction
- [ ] Prefer TanStack Router’s lazy route mechanism over ad hoc `React.lazy` where available

#### Re-measure

- [ ] Re-run `npm run build`
- [ ] Confirm the warning either disappears or the main chunk size drops meaningfully
- [ ] Record before/after numbers in the final commit body

### Verification

- `npm run test`
- `npm run build` (and compare against baseline)
- `npx prettier --write` on every file touched
- Manual browser smoke:
  - `/` loads and does not pull board code
  - `/auth` loads without board code
  - `/boards` still renders first paint without visible regression
  - Opening a card detail still feels immediate

### Commit points

- `refactor: lazy-load board detail surfaces`
- `refactor: keep DnD imports scoped to board routes`
- Final commit body must include before/after bundle sizes

### Out of scope

- Visual polish (Session 06)
- Backend changes
- Dependency upgrades

### Definition of done

`npm run build` reports smaller board-route chunks, the original size warning is gone or materially reduced, and no runtime behavior regressed during the browser smoke pass.

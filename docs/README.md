## Docs Index

Start here. This index exists so coding agents (and humans) can find the right spec, checklist, or architecture doc without scanning the whole directory.

When adding a new doc, add it to the matching section below. Keep each entry on one line and lead with the filename so directory order and index order match.

### Project Roots

- [`AGENTS.md`](../AGENTS.md) — project conventions (formatting, Tamagui, testing, accessibility, backend rules)
- [`CLAUDE.md`](../CLAUDE.md) — Claude-specific pointer (re-exports `AGENTS.md`)
- [`PROGRESS.md`](../PROGRESS.md) — append-only unattended-execution progress log

### Product and Architecture

- [`kanban-app-requirements.md`](./kanban-app-requirements.md) — evaluator-facing product + backend requirements
- [`app-architecture-overview.md`](./app-architecture-overview.md) — architecture reference; tiebreaker for ambiguous todos
- [`frontend-library-decisions.md`](./frontend-library-decisions.md) — cross-slice frontend library defaults

### Implementation Plans and Status

- [`implementation-todo.md`](./implementation-todo.md) — phase-based build plan (phases 1–10)
- [`agent-kickoff.md`](./agent-kickoff.md) — unattended-execution entry point for phases 1–9
- [`kanban-backend-roadmap.md`](./kanban-backend-roadmap.md) — roadmap supporting the backend build
- [`kanban-backend-implementation-checklist.md`](./kanban-backend-implementation-checklist.md) — backend execution checklist (complete)
- [`kanban-frontend-implementation-checklist.md`](./kanban-frontend-implementation-checklist.md) — frontend execution checklist (largely complete)

### Next Steps (post-main-build)

- [`kanban-next-steps.md`](./kanban-next-steps.md) — master roadmap for the next milestone
- [`next-steps/README.md`](./next-steps/README.md) — session-by-session checklists an agent can open and execute

### UX Specs

- [`ux-spec-meta-plan.md`](./ux-spec-meta-plan.md) — meta plan for how UX specs are authored
- [`ux-specs/`](./ux-specs/) — one folder per feature slice; see `ux-specs/README.md` for the slice map
- [`ux-specs/README.md`](./ux-specs/README.md) — slice-by-slice entry point for spec, wireframe, build briefs, open questions, readiness

### Reference Assets

- [`tamagui-counter-mockup.png`](./tamagui-counter-mockup.png) — mockup used during the Tamagui slice
- [`ux-specs/mockup.png`](./ux-specs/mockup.png) — kanban board visual reference

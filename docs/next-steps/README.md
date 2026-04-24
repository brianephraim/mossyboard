## Next-Steps Session Checklists

Each file in this directory is a self-contained implementation session a coding agent can pick up and execute end-to-end without reading the whole repo. Sessions are intentionally small so one agent run can complete one session, verify it, and commit.

Execute sessions in the order below unless the user says otherwise. Later sessions assume earlier ones have landed.

### Execution Order

1. [`01-auth-frontend.md`](./01-auth-frontend.md) — replace the scaffold auth page with the spec-shaped Tamagui flow
2. [`02-signed-in-qa.md`](./02-signed-in-qa.md) — full browser QA pass with real credentials, both verification modes
3. [`03-frontend-tests.md`](./03-frontend-tests.md) — route protection and key board-flow coverage
4. [`04-inline-column-rename.md`](./04-inline-column-rename.md) — replace modal rename with inline rename
5. [`05-bundle-split.md`](./05-bundle-split.md) — reduce the board-route client chunk
6. [`06-polish.md`](./06-polish.md) — visual and interaction polish pass

### Session Template

Every session file follows the same structure so agents know where to look:

- **Session goal** — one-paragraph purpose
- **Pre-read** — every doc and file the agent must read first
- **Preconditions** — what must already be true before starting
- **Checklist** — actionable, in-order steps; each becomes a todo
- **Verification** — commands to run and states to eyeball
- **Commit points** — where to stop and commit so history stays readable
- **Out of scope** — what this session deliberately does not touch
- **Definition of done** — the single sentence that closes the session

### Session Conventions

- Follow [`AGENTS.md`](../../AGENTS.md). When it conflicts with a session, AGENTS.md wins.
- Keep commit subjects under ~70 chars and use `feat:` / `fix:` / `test:` / `docs:` / `refactor:` prefixes, matching the existing history.
- Update the matching checkbox in [`../kanban-frontend-implementation-checklist.md`](../kanban-frontend-implementation-checklist.md) when a session lands behavior it tracked.
- If a session blocks, append a note to [`../../PROGRESS.md`](../../PROGRESS.md) with `BLOCKED:` and continue with the next non-dependent session.

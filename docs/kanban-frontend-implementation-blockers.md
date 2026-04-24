# Kanban frontend implementation blockers

## Session 02 — Signed-in browser QA

**Status:** blocked at milestone close.

**Reason:** `AGENT_LOGIN_EMAIL` and `AGENT_LOGIN_PASSWORD` are not present in `.env`, so the signed-in browser pass from [`next-steps/02-signed-in-qa.md`](./next-steps/02-signed-in-qa.md) cannot be executed without invented credentials. See [`AGENTS.md`](../AGENTS.md) (Browser Testing Credentials).

**Next step:** Add those variables to `.env`, rerun Session 02, and tick the “Signed-in board flows” milestone item in [`kanban-next-steps.md`](./kanban-next-steps.md) when verified.

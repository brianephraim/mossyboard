# AGENTS.md

## Project Ground Rules

- This document may reference intended architecture, tooling, and packages that are not yet installed. Do not add/install new dependencies or infrastructure just because they are mentioned here—only do so when we reach the phase that requires them.
- Organize files and folders by feature or purpose, keeping related code colocated.
- Avoid naming files and folders with names including substrings of `utils` `helpers` or other "junk drawer" names, when practical.
- For every new or altered table in schema `public`, include RLS setup in the same migration: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` plus explicit `CREATE POLICY` statements (no implicit default access). Treat a clean Supabase security lint as required before merge.
- Firebase is auth-only in this repo. Do not treat Firebase as the app hosting platform.
- Vercel is the canonical app hosting and deployment destination for production.
- Do not add or revive Firebase App Hosting files, scripts, docs, or workflow steps (`apphosting.yaml`, `firebase.json`, `.firebaserc`, `scripts/firebase/*`, or `firebase deploy --only apphosting`) unless the user explicitly asks for a hosting migration.
- When deployment behavior or docs are updated, keep `.github/workflows/deploy.yml`, `package.json` deploy scripts, and README deployment instructions aligned with Vercel as the source of truth.

## Styling & UI (Tamagui)

- Use `@tamagui/core` components for UI structure and styling.
- `@tamagui/core` is intentionally minimal. When additional Tamagui functionality is needed, install the appropriate Tamagui package (prefer the smallest official package that satisfies the need) rather than re-implementing it or dropping to raw HTML.
- Keep all Tamagui packages on the same version (avoid mixed versions across `@tamagui/*` dependencies).
- Prefer Tamagui primitives (for example `Stack`, `XStack`, `YStack`, `Text`, `Button`, `Input`) over raw JSX HTML elements.
- Do not introduce raw HTML elements in component JSX (`div`, `span`, `p`, `section`, etc.) unless there is a documented, unavoidable platform requirement.
- When replacing or adding UI, migrate toward Tamagui-first composition rather than mixed raw HTML + Tamagui patterns.
- Keep styling in Tamagui props/tokens where possible instead of ad hoc inline CSS patterns designed for HTML tags.
- Avoid `className` and `style` props on Tamagui-based components when possible; prefer Tamagui style props (for example `backgroundColor="red"`).

## Accessibility

- Every interactive element must be reachable and operable by keyboard alone (Tab, Shift+Tab, Enter/Space to activate, Esc to dismiss).
- Modals and dialogs must trap focus while open, return focus to the invoking element on close, and close on Esc. Use `src/Modal/PrettyModalWrap.tsx` rather than hand-rolled overlays.
- Drag-and-drop interactions must have a non-drag keyboard alternative (for example, move-card buttons or a keyboard reorder affordance) — never ship drag-only reordering.
- Prefer semantic Tamagui primitives and HTML semantics (`button`, `nav`, `main`, heading levels) over generic containers with ARIA bolted on. Reach for ARIA only when no semantic primitive fits.
- Every form control has an associated label (visible label preferred, `aria-label` only when a visible label is not possible). Error messages are associated with their input via `aria-describedby`.
- Every non-decorative image or icon has an accessible name. Icon-only buttons carry an `aria-label`.
- Color is never the sole carrier of meaning (pair with text, shape, or iconography). Meet WCAG AA contrast on text and interactive surfaces.
- Respect `prefers-reduced-motion` for any non-trivial animation or transition.
- Live regions announce asynchronous state changes that matter (for example, "card moved", "save failed") via `aria-live="polite"` on a dedicated region rather than on the changing content itself.

## Backend Conventions

- Every tRPC procedure declares a zod `.input(...)` schema. No procedure accepts unvalidated input.
- Every service method that touches `boards`, `columns`, or `cards` takes `ownerId` as an explicit argument sourced from `ctx.userId` and filters by it. Never infer ownership from a global or cache.
- Every read of owned data filters `deleted_at IS NULL AND owner_id = ?`. Never return soft-deleted rows by default.
- On every write that references another row's id (target column, parent board, etc.), validate that row belongs to the caller before acting on it — prevents cross-owner id smuggling.
- Every reorder or move mutation runs inside a transaction, performs `SELECT ... FOR UPDATE` on the moved row, and bumps `version` alongside the write. Clients pass last-known `version`; mismatch returns a consistent conflict `TRPCError`.
- New fractional-key inserts use the `keyBetween(prev, next)` helper. Do not hand-compute keys.
- Server errors are thrown as `TRPCError` with a documented code. Do not invent parallel error shapes.
- Sensitive values (ID tokens, passwords, full card bodies) never appear in log lines. Log `userId`, `requestId`, `path`, and outcome — not payloads.
- See `docs/app-architecture-overview.md` for the full rationale behind these rules.

## Database Migrations

- After running `npm run db:generate`, always follow with `npm run db:migrate` so the schema and the database stay in sync. A generated migration file that is never applied is the same as no migration at all.
- `npm run dev` runs migrations automatically via the `predev` script. If you start the server some other way (custom node command, background process, debugging into TanStack Start), run `npm run db:migrate` first.
- Before debugging any database-touching tRPC procedure, repo function, or server route, confirm the migration count under `drizzle/pg/*.sql` matches what the database has applied. A `relation "x" does not exist` (Postgres `42P01`) is almost always missing migrations, not a code bug — drizzle's `Failed query: ...` wrapper hides the underlying message, so check the table list before chasing the query.
- Tests handle their own migrations via `migrateTestDb()` in `src/server/testing/database.ts` (targets `DATABASE_URL_TEST` / `DATABASE_URL_TEST_POOLER`). Do not add a blanket `pretest` migration step — it would target the wrong database.

## Formatting

- Run `npx prettier --write <file>` on every file you create or modify before committing.
- Config: `.prettierrc` (2-space indent, double quotes, trailing commas, 100 print width).

## Implementation Preference

- Use Context7 to fetch current official docs/examples when implementing or debugging third-party libraries (especially `@tamagui/core`) if API details are uncertain or likely version-sensitive.
- Avoid the `any` type whenever possible; prefer precise TypeScript types, generics, and narrowing.
- Avoid the `as unknown` casting trick whenever possible; fix the underlying types first.
- If blocked and a temporary escape hatch is unavoidable, prefer `as unknown as SpecificType` over `any`, and keep the cast scope as small as possible.

## File Size and Abstraction Guardrails

- Prefer cohesive files over monoliths and over-fragmentation.
- Use soft caps, not hard limits. Exceeding a cap is allowed when cohesion/readability is still strong, but include a brief rationale in your final task summary.

### Soft Size Targets (Balanced)

- UI components, hooks, feature service modules: target <= 300 LOC, review/split around 500 LOC.
- Utility, helper, mapper, and type-focused files: target <= 200 LOC, review/split around 350 LOC.
- Exception guidance: keep a larger file intact when logic is tightly coupled and splitting would increase indirection without reuse benefits.

### Split Heuristics

- Split a file when one of these is true:
- It contains multiple responsibilities that can be understood/tested independently.
- A subset is reusable across features/modules.
- A section has grown into a distinct concern (for example: parsing, normalization, API adapter, view model shaping).
- Do not split when logic is tightly coupled to one feature path and extraction would create "jump-around" complexity.

### Abstraction Heuristics

- Add/expand an abstraction when it removes real duplication or concentrates non-trivial shared complexity.
- Avoid abstractions for one-off call sites, trivial wrappers, or speculative future reuse.
- Rule of thumb: abstract when behavior is repeated or clearly converging across multiple places, not just because code "looks similar."

### Mandatory Targeted Scan Before New Abstractions

- Before introducing a new abstraction, search/read 2-3 similar areas in `src/` to check for existing patterns or near-duplicates.
- Use fast code search first (for example `rg`) to locate candidate files, then inspect the most relevant 2-3.
- If overlap exists, prefer reusing/refactoring into an existing abstraction.
- If no suitable overlap exists, keep logic local and note a brief reason in the final summary (for example: "scanned X/Y/Z; no compatible shared pattern found").

## Code Navigation

- Prefer the `jcodemunch` MCP index for repository exploration and symbol-aware lookups.
- At the start of substantial code investigation, run `jcodemunch.index_folder` on the workspace if the repo is not already indexed or may be stale.
- Prefer indexed lookups such as `get_repo_outline`, `get_file_tree`, `search_symbols`, `get_file_outline`, `get_symbol`, and `search_text` before broad file crawling.
- Treat the `jcodemunch` index as a cached view of the repo, not the source of truth.
- Re-run `jcodemunch.index_folder` with incremental indexing after file adds, deletes, renames, or substantial refactors before relying on symbol-based MCP lookups.
- Minor in-file edits do not require immediate re-indexing if you are working from direct file reads or exact-text search.
- Use `rg` for fast exact-text search, verifying indexed results, or finding content that is not well represented by symbol extraction.
- If indexed results disagree with the current filesystem, trust direct file reads and refresh the index.

## Testing

- **Unit**: Vitest + `node:assert/strict`. Test files colocated as `*.test.ts`.
- **Hooks/components**: `@testing-library/react` with jsdom.
- **E2E**: Playwright (Chromium). Tests in `e2e/`, login helper at `e2e/helpers/login.ts`.
- Run all tests: `npm run test`.
- For full conventions (mock patterns, extraction heuristics), see the `test-writer` skill.

## Worktrees

- `.env` is gitignored and does not appear in worktrees by default.
- The project auto-loads `.env` from the current directory or ancestors (up to a bounded depth) and stops at the first real `.git/` repo root.
- This supports nested worktrees (for example under `.worktrees/`) without copying/symlinking `.env`.
- If env vars are still missing in a worktree, treat it as a real setup issue and debug path/layout assumptions.

## Browser Testing Credentials

- `AGENT_LOGIN_EMAIL` and `AGENT_LOGIN_PASSWORD` are available in `.env` for agents running browser-based testing flows.
- When an agent performs browser login during tests, use these env vars instead of hardcoded credentials.

## Git Push Notifications

- After every successful push to `main`, output the pushed commit hash to the engineer in the format:
  `Pushed to main: <full-commit-hash>`
- After opening a pull request, output the commit hash of the PR head in the format:
  `Opened PR: <full-commit-hash>`
- Run `git rev-parse HEAD` after the push or PR creation to get the hash if it was not already captured.

## Log Analysis Contract

- Use `.logs/` as the primary artifact store for pipeline review tasks.
- Log filenames are timestamp-first, so plain filename sort is chronological.
- Incoming route interactions write `incoming-request-start` first and `incoming-request-complete` last.
- The top-level `requestId` is the primary correlation key for a single user interaction.
- Downstream provider logs inherit the same `requestId` through request-scoped async context.
- `trace.route` and `trace.interaction` identify the interaction family when present.
- Route start logs include `request.body.interactionLog`, which is the authoritative snapshot of selected items, curated ids, and resolved prompt inputs at click time.
- For trace reconstruction, prefer `npm run logs:trace -- product-review`, `npm run logs:trace -- generate-quips`, `npm run logs:trace -- dig-deeper`, or `npm run logs:trace -- --request-id <id>` before opening raw files.

## Skills

A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills available in this repo.

### Available skills

- pretty-modal-wrap-enforcer: Enforce consistent modal implementation by requiring `src/Modal/PrettyModalWrap.tsx` for new dialogs and modal refactors. Use when a request adds, updates, debugs, or reviews modal UI/dialog overlays/popup flows. (file: skills/pretty-modal-wrap-enforcer/SKILL.md)
- rhf-tamagui-forms: Standardize forms around `src/form` reusable RHF + Tamagui fields that bind by `name` through form context instead of inline `Controller` wiring. Use when a request adds, refactors, debugs, or reviews forms. (file: skills/rhf-tamagui-forms/SKILL.md)
- test-writer: Write unit and E2E tests following project conventions (Vitest, node:assert/strict, @testing-library/react, Playwright). Use when a request adds, expands, debugs, or reviews tests. (file: skills/test-writer/SKILL.md)

### How to use skills

- Trigger rules: If a user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description, use that skill for that turn.
- Missing/blocked: If a named skill is missing or unreadable, say so briefly and continue with the best fallback.

## Skill Opportunity Check

- For substantial implementation, debugging, migration, or refactor tasks, evaluate whether a reusable skill should be proposed.
- Only suggest a new skill when expected reuse is at least 3 future tasks OR when the skill would prevent recurring high-cost mistakes.
- At the end of the task, include one of:
  - `Skill suggestion: none`
  - `Skill suggestion: <skill-name>` and include:
    1. Trigger phrases
    2. What it standardizes
    3. Files/resources it would include
    4. Expected payoff (time/risk reduction)
- Create or update skills only after user approval.
- Store approved project skills in `skills/<skill-name>/` and index them in this `AGENTS.md`.

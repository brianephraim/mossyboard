# Kanban Backend Implementation Checklist

This checklist turns the current backend briefs into an implementation-ordered execution plan.

## 1. Foundation and Schema

- [x] Extend `cards` with `priority`
- [x] Add `card_subtasks`
- [x] Generate and review the Drizzle migration
- [x] Add RLS enablement and explicit policies for any new or altered `public` tables in the same migration
- [x] Verify existing schema exports and relations stay coherent after the new tables and columns land

## 2. Shared Backend Plumbing

- [x] Add shared Kanban backend helpers for:
  - [x] ownership lookups through `boards -> columns -> cards`
  - [x] stable `updated_at` bumping for board/card/subtask writes
  - [x] conflict-safe row locking and version checks where needed
- [x] Keep helper extraction minimal and feature-oriented rather than creating a junk-drawer module

## 3. Card Core

- [x] Extend board read shapes to include card `priority`
- [x] Implement card repo operations:
  - [x] `card.create`
  - [x] `card.update`
  - [x] `card.softDelete`
  - [x] `card.get`
- [x] Implement card service layer
- [x] Implement `card` router with zod input validation
- [x] Wire `card` router into the app router

## 4. Subtasks

> Removed in 2026-04-26 tags rewrite — see `docs/superpowers/specs/2026-04-26-replace-card-subtasks-with-tags-design.md`. The `tag` router (`list` / `addToCard` / `detachFromCard`) and `tags` + `card_tags` schema replace this section.

- [x] Implement subtask repo operations:
  - [x] `subtask.create`
  - [x] `subtask.update`
  - [x] `subtask.toggle`
  - [x] `subtask.softDelete`
- [x] Ensure subtask writes also bump parent card `updated_at`
- [x] Implement subtask service layer
- [x] Implement `subtask` router with zod input validation
- [x] Wire `subtask` router into the app router

## 5. Column Management

- [x] Implement column repo operations:
  - [x] `column.create`
  - [x] `column.rename`
- [x] Implement column service layer
- [x] Implement `column` router with zod input validation
- [x] Wire `column` router into the app router

## 6. Move and Reorder

- [x] Implement card repo operations:
  - [x] `card.move`
  - [x] `card.reorder`
- [x] Implement column repo operation:
  - [x] `column.reorder`
- [x] Use transactions, `SELECT ... FOR UPDATE`, `keyBetween`, and `expectedVersion` conflict checks on every move or reorder path
- [x] Reuse shared internal ordering logic where it genuinely reduces duplication

## 7. Filtering and Pagination

- [x] Implement `card.listByBoard`
- [x] Validate stable cursor pagination behavior
- [x] Ensure board-scoped ownership checks and soft-delete filtering apply to paginated reads

## 8. Board Lifecycle

- [x] Implement `board.rename`
- [x] Implement `board.softDelete`
- [x] Ensure board soft delete cascades to descendant columns and cards in the service layer

## 9. Tests

- [x] Add repo/service/integration coverage for:
  - [x] ownership boundaries
  - [x] validation boundaries at the router layer
  - [x] card and subtask soft delete behavior
  - [x] move/reorder conflict paths
  - [x] filtered list pagination
  - [x] board soft-delete cascade
- [x] Keep fast router validation tests where they already fit current patterns
- [x] Keep DB-backed repo tests focused on high-value real paths

## 10. Verification

- [x] Run targeted tests during each milestone
- [x] Run a broad backend-relevant test pass at the end
- [x] Run `npm run build`

## 11. Blocker Handling

- [x] No persistent blockers remained by the end of implementation
- [x] Move to the next non-blocked milestone when possible
- [x] Return to unresolved blockers before finishing

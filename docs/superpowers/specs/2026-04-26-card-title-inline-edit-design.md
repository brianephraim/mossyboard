---
title: Inline-edit card titles (board canvas)
date: 2026-04-26
status: draft
---

## Summary

Make **card titles** inline editable in the board canvas, matching the existing inline-edit behavior for **column titles**:

- always-visible input (no “edit mode” toggle)
- submit/save on **blur** and **Enter**
- cancel/revert on **Escape**
- supports coexistence with `@hello-pangea/dnd` dragging:
  - click focuses the input on **mouseup** (so press-drag gestures still reorder cards)
  - while the input is already focused, it behaves like a normal input (cursor positioning + drag-to-select)
- clicking **Open** still works normally and should not accidentally focus/edit the title

## Context

Cards are rendered in `src/features/boards/BoardCanvas/CardInterior.tsx` inside a draggable context:

- card draggables already use `disableInteractiveElementBlocking` (so dnd can start drag from an input region)
- `FormInlineTextField` already supports `focusOnMouseUp` + drag-threshold focusing, plus a window-capture guard to preserve native selection while focused

The server mutation for updates is `card.update` (tRPC), which requires:

- `cardId`
- `title` (trimmed, 1..200)
- `description` (max 10000)
- `priority`
- `expectedVersion`

## Goals

- Card title inline editing works in the canvas list and mirrors the column-title pattern.
- No new ad hoc edit state: RHF owns the field value.
- Dragging still feels correct:
  - drag from the title region should reorder the card
  - click should focus the title (on mouseup)
  - while focused, cursor placement and drag-to-select text works normally
- Clicking the “Open” button triggers open without being intercepted by rename behavior.

## Non-goals

- Editing card description or priority inline in the canvas (already supported elsewhere).
- Changing the card detail modal behavior.
- Introducing a new “click-to-edit” mode or rename button for titles.

## Design

### UI

Update `CardInterior` to render an inline RHF form for the title in place of the current `<Text>{card.title}</Text>`:

- Wrap only the title area in a minimal `FormRoot` / `FormProvider` (same “one-field form” style as board + column titles).
- Render `FormInlineTextField` with:
  - `name="title"`
  - `focusOnMouseUp`
  - styling consistent with existing card title typography

### Interaction rules

- **Blur**: submit if trimmed value differs; otherwise no-op (and keep canonical value).
- **Enter**: submit.
- **Escape**: reset input to current `card.title` and blur (matching column-title behavior).
- **Open button**: remains a normal button; no global click handler that would focus the title.

### Data flow

On submit:

- Compute `nextTitle = trimmed(title)`
- If `nextTitle === card.title`, do nothing (optionally `form.reset({ title: card.title })` to normalize whitespace).
- Else call `card.update` with:
  - `cardId: card.id`
  - `title: nextTitle`
  - `description: card.description ?? ""` (send existing value)
  - `priority: card.priority` (send existing value)
  - `expectedVersion: card.version`

Error handling matches existing inline rename flows:

- conflict (`expectedVersion` mismatch) surfaced consistently (toast or inline message per existing pattern)
- on successful update, the board query cache invalidation or optimistic update pattern should refresh the list title

### DnD coexistence constraints

Because `@hello-pangea/dnd` listens at **window capture** for mouse down and may call `preventDefault()` once it locks a draggable, the input must:

- use `focusOnMouseUp` to focus after the drag threshold is evaluated
- install the window-capture `stopImmediatePropagation()` guard (already implemented in `FormInlineTextField`) so that while the input is focused, native cursor placement and drag-to-select behavior is preserved

## Testing plan

- Add/extend a board canvas test to cover:
  - **blur saves**: editing title then blurring triggers `card.update`
  - **escape cancels**: editing then pressing Escape restores original
  - **open still works**: clicking “Open” calls `onOpen` and does not focus the title input
- Keep existing `FormInlineTextField` gesture tests intact (already cover capture-phase stop while focused).

## Rollout

Small, localized change in `CardInterior` plus a new/updated test. No schema changes.

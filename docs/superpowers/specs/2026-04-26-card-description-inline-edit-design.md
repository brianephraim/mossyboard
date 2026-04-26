---
title: Inline-edit card descriptions (auto-growing textarea)
date: 2026-04-26
status: draft
---

## Summary

Make **card descriptions** inline editable in the board canvas, similar to card titles:

- always-visible field (no edit mode toggle)
- save on **blur** and **Enter**
- trim + no-op + empty-reset handling consistent with existing inline rename flows
- multi-line textarea that **auto-grows** as text wraps / newlines are added
  - no internal scrollbar while growing
  - optional `minRows` / minimum height
  - optional `maxHeight`; once exceeded, stop growing and allow vertical scrolling
- preserve normal textarea behavior: typing, selection, copy/paste, keyboard navigation, form semantics
- safe coexistence with `@hello-pangea/dnd` card dragging (click-to-focus on mouseup + drag threshold)

## Context

Cards render in `src/features/boards/BoardCanvas/CardInterior.tsx` inside a draggable region (the drag handle wraps the content). We already solved a similar interaction for inline title editing:

- `FormInlineTextField` supports `focusOnMouseUp` + a drag threshold to discriminate focus intent vs drag intent.
- It also installs a window-capture guard so that while focused, native cursor placement / drag-to-select is not broken by dnd’s capture-phase `preventDefault()` behavior.
- We introduced `FormInlineRenameField` to centralize one-field RHF submit-on-blur/Enter behavior.

Card updates are performed via the existing `card.update` tRPC mutation, which requires:

- `cardId`
- `title`
- `description`
- `priority`
- `expectedVersion`

Renaming description must therefore call `card.update` with the new description and the **existing** title/priority/version.

## Goals

- Inline card description editing in the canvas list (not just in the card modal).
- Description input auto-grows smoothly (no flicker / scrollbars during growth).
- Works inside a dnd drag handle without breaking:
  - card dragging (press-drag should reorder, not focus)
  - normal textarea selection behavior while focused
- Reusable component(s) in `src/form` so this pattern can be reused for other inline multi-line fields.

## Non-goals

- Escape-to-cancel behavior (can be added later across title + description consistently).
- Editing other card fields inline (priority, subtasks).
- Changing card detail modal behavior.

## Design

### Reusable form component

Create a reusable RHF-bound inline textarea field in `src/form`:

- Name: `FormInlineAutoGrowTextAreaField` (final name can be adjusted, but it must live in `src/form` and bind by `name`).
- Bindings:
  - uses `useFormContext` + `register` + `setValue` (like `FormInlineTextField`)
  - accepts `name`, `rules`, and passes through Tamagui `TextArea` props (minus the RHF-owned ones)
- Auto-grow behavior (web):
  - holds a ref to the underlying `<textarea>` DOM node
  - `useLayoutEffect` (or effect + synchronous resize) runs on mount and whenever the value changes externally
  - resize algorithm:
    1. set `style.height = "auto"` so it can shrink
    2. compute `next = textarea.scrollHeight`
    3. apply `style.height = \`\${next}px\``(or clamp to`maxHeight`)
  - set `overflowY: hidden` while under `maxHeight`
  - once clamped to `maxHeight`, set `overflowY: auto`
  - set `resize: none` by default (can be overridden)
  - support `minRows` by converting rows → px (using computed line-height) or by accepting `minHeight` directly; prefer `minHeight` for determinism
- DnD coexistence:
  - accept `focusOnMouseUp` + `focusOnMouseUpDragThresholdPx` with the same semantics as `FormInlineTextField`
  - install the same window-capture guard while focused so dnd cannot suppress native selection behavior

This component remains a primitive (like `FormInlineTextField`), not an application-specific “card description editor”.

### Card wiring

Update `CardInterior` to replace the current read-only description rendering (`Text numberOfLines={3}` / “No description yet.”) with the new inline textarea field.

Behavior:

- Always present (no toggle)
- Default value: `card.description` (empty string allowed)
- Save on blur and Enter via a small “one-field form” wrapper, analogous to `FormInlineRenameField` but allowing empty values (description may be intentionally empty):
  - `next = values.description.trimEnd()` (or full `trim()`; decide and document)
  - no-op if unchanged vs existing description (after chosen normalization)
  - call `card.update` with:
    - `cardId`
    - `description: next`
    - `title: card.title` (unchanged)
    - `priority: card.priority` (unchanged)
    - `expectedVersion: card.version`

We should reuse components where it makes sense:

- Add capabilities to `FormInlineRenameField` only if it remains semantically correct (it currently treats empty as invalid and resets). Description needs empty to be valid, so we should not force-fit it.
- Prefer a small sibling wrapper, e.g. `FormInlineEditField` or `FormInlineSubmitField`, that can be configured for:
  - allowed empty vs reset-on-empty
  - normalization function (trim behavior)
  - `onSubmitValue(next)` callback

### Styling

The textarea should visually match the card description text:

- muted text color
- no visible border/background until focus (use focusVisibleStyle like titles)
- takes available width; grows vertically

### Testing plan

Add a BoardCanvas test similar to card title inline edit:

- blur saves: change description, blur, assert `onRenameTitle`/`onUpdateCard` callback called with expected payload
- enter saves: keydown Enter then immediate blur, assert called once
- basic “autogrow” behavior unit tests are optional; jsdom does not compute real layout/`scrollHeight` reliably unless `scrollHeight` is stubbed

## Rollout

Localized changes in:

- `src/form/` (new reusable field + small wrapper)
- `src/features/boards/BoardCanvas/CardInterior.tsx` (swap description display to editable field)
- tests

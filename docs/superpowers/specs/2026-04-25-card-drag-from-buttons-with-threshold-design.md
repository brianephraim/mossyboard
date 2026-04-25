## Summary

Enable dragging a board card from **any part of its content**, including when the pointer starts over an interior button, while preserving normal button behavior for simple clicks.

This design applies to the board (kanban) view that uses `@hello-pangea/dnd`.

## Goals

- Drag can start from **anywhere on the card**, not just the title/header area.
- If a pointer starts on an **interior button**, a **drag threshold** (movement slop) applies:
  - If the pointer is pressed and released without exceeding the threshold, the button behaves like a normal click/press.
  - If the pointer moves beyond the threshold while pressed, we start a drag and **suppress the button click** on release.
- Dragging from **non-button content** should feel immediate (no threshold gating beyond what the DnD library already does).

## Non-goals

- Changing keyboard reordering behavior (arrow-move controls) beyond ensuring it still works.
- Introducing a new drag-and-drop library.
- Altering the card detail surface or list view behavior.

## Current behavior (baseline)

- Cards are `Draggable` with `@hello-pangea/dnd`.
- The card drag handle is currently attached to a header `div` (title + priority), so dragging from interior content (description, buttons) does not start a drag.
- Interior actions (e.g. `Open` button) work as normal buttons.

## Proposed approach (Option B)

### 1) Make the card draggable from anywhere

- Move the `dragHandleProps` attachment from the header `div` to the card’s outer/root container (the wrapper that contains all card content).
- Keep the existing `draggableProps` placement unchanged (on the outer HTML wrapper the library requires).

### 2) Add a “button-only drag threshold gate”

For interior buttons inside the card body (e.g. `Open`), wrap the button with a small interaction gate that:

- On `pointerdown` (capture phase), records:
  - pointer id (if available)
  - initial client coordinates
  - the target card id
- While the pointer is down, listens to `pointermove` and computes distance from start.
- If movement exceeds a constant threshold (suggested: 6px):
  - Programmatically start the DnD drag for that card using the existing sensor API (`tryGetLock(cardId)` → `snapLift()`).
  - Mark a “drag started from button gate” flag so the upcoming click is suppressed.
  - Prevent default / stop propagation as needed to avoid the button press activation while dragging.
- On `pointerup` / `pointercancel`:
  - If drag did not start, allow the normal click/press to proceed.
  - If drag started, suppress the click and clean up listeners/state.

### 3) Click suppression rule

- Only suppress the click when the threshold was exceeded and a drag was started.
- Do not suppress clicks for non-button parts of the card.

## Accessibility & UX constraints

- Buttons must remain keyboard-operable (Enter/Space activation) and focusable.
- The gating logic must only run for pointer interactions; it must not interfere with keyboard activation.
- Ensure focus-within behavior used to reveal move controls is not regressed.

## Implementation notes (expected file touch points)

- Primary: `src/features/boards/BoardCanvas.tsx`
  - Adjust `CardInterior` so the drag handle covers the entire card container.
  - Implement a small helper component/function local to this file to provide the button drag-threshold gating.

## Testing / verification checklist

- Drag card by grabbing title, description, whitespace: drag begins normally.
- Press `Open` and release without moving: opens card as before.
- Press `Open`, move pointer > threshold, release:
  - card drags (and can be dropped)
  - `Open` does **not** trigger after the drag
- Repeat for other interior buttons inside card content (if any).
- Keyboard: tab to `Open`, press Enter/Space still opens; no drag occurs.


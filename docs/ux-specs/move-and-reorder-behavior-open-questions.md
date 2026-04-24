# Open Questions Log: Move and Reorder Behavior

## 1. Product Questions

### Question: Should touch-first mobile interaction lean more on explicit move actions than drag?

- Current assumption in the canonical spec: explicit actions are the guaranteed fallback everywhere
- Status: open
- Blocking: no

### Question: Should later versions add undo for successful moves?

- Current assumption in the canonical spec: no undo in this slice
- Status: open
- Blocking: no

## 2. Recorded Decisions

- use `@hello-pangea/dnd`
- keep explicit non-drag move controls
- use optimistic movement with rollback on failure or conflict
- use one board-level reload-latest recovery pattern for conflicts
- keep selected card detail open when the selected card moves within the same board

## 3. Tracking Summary

- Blocking questions: none
- Non-blocking product questions: 2
- Non-blocking engineering sign-offs: 0

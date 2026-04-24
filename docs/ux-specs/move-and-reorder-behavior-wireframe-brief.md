# Wireframe Brief: Move and Reorder Behavior

## 1. Source of Truth

This brief is derived from [`docs/ux-specs/move-and-reorder-behavior.md`](./move-and-reorder-behavior.md) only. Do not change product behavior while designing wireframes.

## 2. Slice Objective

Visualize how cards and columns move or reorder, including drag affordances, non-drag alternatives, optimistic feedback, and conflict rollback messaging.

## 3. Scope for the Wireframe Agent

Include only:

- card drag states
- card explicit move controls
- column drag states
- column explicit move controls
- board-level conflict recovery UI

Do not design:

- card edit or detail surfaces beyond contextual placement
- column create or rename controls
- filters, grouping, or board settings
- toast-based undo

## 4. Behavior Constraints to Preserve

- Every drag interaction has a non-drag fallback.
- Card and column moves are optimistic, but conflicts roll back.
- Board conflict recovery uses one inline `Reload latest` pattern.
- Moving the selected card keeps its detail surface open and coherent.

## 5. User Flows to Visualize

1. Reorder card within column by drag
2. Move card across columns by drag
3. Reorder card with explicit move controls
4. Reorder columns by drag
5. Reorder columns with `Move left` and `Move right`
6. Conflict rollback and board reload recovery

## 6. Screens to Design

| ID  | Screen                  | Required variants                  |
| --- | ----------------------- | ---------------------------------- |
| A1  | Card drag interaction   | dragging with visible drop targets |
| A2  | Card movement result    | optimistic moved                   |
| A3  | Card movement result    | conflict rollback                  |
| B1  | Card action menu        | explicit move controls             |
| C1  | Column drag interaction | dragging with visible drop targets |
| C2  | Column action menu      | `Move left` / `Move right`         |
| D1  | Board conflict message  | default                            |
| D2  | Board conflict message  | reload pending                     |

## 7. Required Copy

- `Move up`
- `Move down`
- `Move to column...`
- `Move left`
- `Move right`
- `Board order changed`
- `Your last move didn't stick because the board changed elsewhere. Reload the latest board and try again.`
- `Reload latest`

## 8. Annotations to Show

- exact interaction state label
- what is optimistic versus confirmed
- focus target after move success
- disabled boundary states for explicit move controls
- live-region announcements for move success and conflict
- relationship between board move state and selected card detail state

## 9. Responsive Notes

- Explicit movement controls must remain visible or discoverable on all viewports.
- Board conflict messaging should not cover the whole board on narrow screens.
- Drag affordances can be shown as pointer-first without implying drag-only behavior.

## 10. Accessibility Callouts

- explicit non-drag fallback for every drag flow
- semantic disabled state for movement boundaries
- accessible names for drag handles and move actions
- non-color dragged and conflict treatments

## 11. Open Design Questions

1. How prominent should drop-target indicators be without making the board visually noisy?
2. Should explicit movement controls look menu-based, button-based, or hybrid?

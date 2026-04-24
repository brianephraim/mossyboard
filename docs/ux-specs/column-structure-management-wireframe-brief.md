# Wireframe Brief: Column Structure Management

## 1. Source of Truth

This brief is derived from [`docs/ux-specs/column-structure-management.md`](./column-structure-management.md) only. Do not change product behavior while designing wireframes.

## 2. Slice Objective

Visualize how a user adds columns and renames column titles inside a loaded board.

## 3. Scope for the Wireframe Agent

Include only:

- board-end add-column entry
- add-column-after flow from a column header
- inline column rename
- validation, pending, and failure states

Do not design:

- column reorder
- column delete
- card interactions beyond surrounding context
- filters, grouping, or board settings

## 4. Behavior Constraints to Preserve

- Column creation is title-only.
- New columns are empty on creation.
- New columns can be added at board end or immediately after an existing column.
- Column rename is inline in the header.
- No discard-confirmation dialog exists for create or rename in this slice.

## 5. User Flows to Visualize

1. Add a column at board end
2. Add a column after an existing column
3. Rename a column inline
4. Hit a rename conflict and show reload-latest recovery

## 6. Screens to Design

| ID  | Screen                    | Required variants                  |
| --- | ------------------------- | ---------------------------------- |
| A1  | Board-end add-column slot | idle trigger                       |
| A2  | Board-end add-column slot | composing                          |
| A3  | Add-column composer       | validation or generic create error |
| B1  | Column header             | read mode with overflow actions    |
| B2  | Column header             | inline rename edit mode            |
| B3  | Column header             | rename conflict                    |

## 7. Required Copy

- `Add column`
- `Add column after`
- `Rename column`
- `Column title`
- `Enter a column title`
- `Create column`
- `Save`
- `Cancel`
- `Creating column...`
- `Saving...`
- `This column changed elsewhere. Reload the latest version and try again.`

## 8. Annotations to Show

- exact state label
- insertion position for create-at-end versus create-after-existing
- initial focus target
- keyboard path
- live-region announcements
- focus target after create success and rename success

## 9. Responsive Notes

- The board-end create composer should still read clearly on narrow screens.
- Inline rename should stay visibly attached to the current column header.
- Action buttons may stack on narrow screens.

## 10. Accessibility Callouts

- visible labels for create and rename fields
- keyboard access to overflow actions
- non-color error and pending treatment
- live-region announcements for success and failure states

## 11. Open Design Questions

1. Should the add-column composer feel like a lightweight inline card or a more explicit mini-form?
2. How prominent should the board-end add-column slot be when no column create flow is active?

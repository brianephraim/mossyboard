# Wireframe Brief: Board Management and Lifecycle

## 1. Source of Truth

This brief is derived from [`docs/ux-specs/board-management-and-lifecycle.md`](./board-management-and-lifecycle.md) only. Do not change product behavior while designing wireframes.

## 2. Slice Objective

Visualize board settings, board rename, discard confirmation, and board delete confirmation.

## 3. Scope for the Wireframe Agent

Include only:

- board-settings entry point in the loaded board header
- board settings dialog
- discard-changes confirmation
- delete-board confirmation
- one-time post-delete status on `/boards`

Do not design:

- board templates
- restore flows
- board sharing
- direct board-index delete actions

## 4. Behavior Constraints to Preserve

- Board settings opens from the loaded board header.
- Rename uses explicit save.
- Delete requires a second confirmation dialog.
- Successful delete returns the user to `/boards` with a one-time `Board deleted.` message.

## 5. User Flows to Visualize

1. Open board settings
2. Rename the board
3. Attempt to close with unsaved rename text
4. Delete the board
5. Land on `/boards` after delete

## 6. Screens to Design

| ID  | Screen                    | Required variants            |
| --- | ------------------------- | ---------------------------- |
| A1  | Board header              | `Board settings` entry point |
| A2  | Board settings dialog     | default                      |
| A3  | Board settings dialog     | dirty rename                 |
| A4  | Board settings dialog     | rename failure               |
| B1  | Discard-changes dialog    | default                      |
| C1  | Delete-board confirmation | default                      |
| C2  | Delete-board confirmation | delete failure               |
| D1  | `/boards` status message  | one-time `Board deleted.`    |

## 7. Required Copy

- `Board settings`
- `Board name`
- `Save changes`
- `Cancel`
- `Delete board`
- `Discard changes?`
- `You have unsaved board-name changes. Leave without saving?`
- `Delete board?`
- `Board deleted.`

## 8. Annotations to Show

- initial focus target
- focus return target on close
- dialog layering between settings and delete confirmation
- post-delete navigation to `/boards`
- one-time nature of the `/boards` status message

## 9. Responsive Notes

- Board settings should become a full-width sheet or full-screen modal on narrow screens.
- Confirmation dialog actions may stack vertically on narrow screens.
- Post-delete status should remain visible near the top of `/boards`.

## 10. Accessibility Callouts

- focus trap and focus return for all dialogs
- visible rename label
- non-color destructive state treatment
- live-region announcements for rename and delete outcomes

## 11. Open Design Questions

1. How visually separated should the destructive section be from the rename section?
2. Should the board-settings trigger live as a standalone button or an overflow-menu action?

# Canonical UX Spec: Board Management and Lifecycle

## 1. Overview

This document defines the Kanban UX slice for renaming a board and deleting a board from within the loaded board experience.

This spec is the parent artifact for later wireframe, frontend, and backend briefs. Those derived briefs must not change the behavior defined here.

### Constraint summary

- Authentication, session-expiry handling, and verification enforcement remain defined by [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md).
- The protected board shell and loaded board foundation remain defined by [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md).
- This slice uses the same approved frontend foundations already chosen for earlier slices:
  - `react-hook-form` for rename form state
  - `PrettyModalWrap` for board settings and delete-confirmation dialogs
- Board deletion remains soft delete in the backend.
- Card, column, filter, and movement behavior are defined in sibling slices and should not be changed here.

### Explicit non-goals for this slice

- Board templates
- Board duplication
- Board restore
- Collaboration or board sharing
- Per-board visual themes

## 2. Slice Goal

Enable a user to rename a board and delete a board from a clear board-settings surface without inventing validation, confirmation, or post-delete navigation behavior.

## 3. Users and Jobs to Be Done

### Primary actors

1. User renaming a board so it better matches the work it contains
2. User removing a board that is no longer needed

### Jobs to be done

- "Let me rename this board without leaving it."
- "Let me delete a board safely and understand what happens next."

## 4. In-Scope Tasks

- Open board settings from a loaded board
- Rename the current board
- Cancel an in-progress rename without saving
- Start board deletion
- Confirm board deletion
- Recover from rename and delete failures

## 5. Out-of-Scope Tasks

- Restoring a deleted board
- Board archive separate from delete
- Board sharing or collaborators
- Changing starter columns or board template after creation

## 6. Assumptions and Dependencies

- The loaded board header exposes a `Board settings` action.
- `Board settings` is available only on `/boards/$boardId`, not on the `/boards` index route in this slice.
- Activating `Board settings` opens a modal dialog using `PrettyModalWrap`.
- The settings dialog contains:
  - a rename section
  - a destructive section for board deletion
- Board rename asks for one field only: board name.
- Board names do not need to be unique per owner in this slice.
- Board deletion requires a second blocking confirmation dialog.
- Successful board deletion routes the user to `/boards`.
- After successful delete, `/boards` shows a one-time inline status message: `Board deleted.`
- Board delete removes the board from normal reads and board list results because it is a soft delete in the backend.

## 7. Data-Scale Assumptions and Limits

- Board name: minimum 1 non-whitespace character after trimming, maximum 80 characters
- One rename request may be in flight per board settings dialog
- One delete request may be in flight per board deletion confirmation

## 8. Workflow Definitions

### Flow 1: Open board settings

- Trigger: User activates `Board settings` from the loaded board header.
- User intent: Inspect rename and delete actions for the current board.
- Preconditions: A board is loaded and visible.
- Steps:
  1. The board settings dialog opens.
  2. Focus moves to the dialog heading.
  3. The current board name is prefilled in the rename field.
- System responses:
  - The underlying board remains visible but inert while the dialog is open.
- Failure cases:
  - none
- Postconditions:
  - Success: settings dialog is visible

### Flow 2: Rename the board

- Trigger: User edits the board name and activates `Save changes`.
- User intent: Update the board name.
- Preconditions: Board settings dialog is open.
- Steps:
  1. The user edits the current board name.
  2. The form becomes dirty.
  3. The user activates `Save changes`.
  4. The rename request enters a pending state.
  5. On success, the dialog remains open with the form reset to the saved name and the loaded board header updates.
- System responses:
  - `Save changes` is disabled until the name is dirty and valid.
  - `Cancel` closes the dialog when there are no unsaved changes.
- Failure cases:
  - Empty name after trim
  - Overlong name
  - Network or server failure
- Postconditions:
  - Success: new board name is visible in the header and future board-list reads
  - Failure: dialog remains open with entered name preserved

### Flow 3: Close settings with unsaved rename text

- Trigger: User tries to close the board settings dialog while rename text is dirty.
- User intent: Leave settings without saving.
- Preconditions: Settings dialog is open and rename form is dirty.
- Steps:
  1. The user activates close or `Cancel`.
  2. A blocking discard-changes confirmation opens.
  3. The user chooses `Discard changes` or `Keep editing`.
- System responses:
  - The settings dialog remains open until the discard decision is made.
- Failure cases:
  - none
- Postconditions:
  - `Discard changes`: settings dialog closes and unsaved rename text is lost
  - `Keep editing`: discard dialog closes and settings dialog remains open

### Flow 4: Delete the board

- Trigger: User activates `Delete board` from the destructive section of board settings.
- User intent: Remove the current board.
- Preconditions: Board settings dialog is open for a valid board.
- Steps:
  1. A delete-confirmation dialog opens over settings.
  2. The user activates `Delete board`.
  3. The delete request enters a pending state.
  4. On success, both dialogs close.
  5. The app routes to `/boards`.
  6. `/boards` shows the one-time `Board deleted.` status message.
- System responses:
  - The delete confirmation explains that the board and its visible content will no longer appear in normal board reads.
- Failure cases:
  - Network or server failure
- Postconditions:
  - Success: current board is no longer available through normal board reads
  - Failure: confirmation dialog remains open with retry-capable error

## 9. Screen and State Inventory

| Surface                      | Route / placement             | Required states                                      |
| ---------------------------- | ----------------------------- | ---------------------------------------------------- |
| Board settings entry point   | loaded board header           | idle                                                 |
| Board settings dialog        | modal over board route        | default, dirty rename, rename saving, rename failure |
| Discard-changes confirmation | blocking dialog over settings | default, discard pending, keep-editing               |
| Delete-board confirmation    | blocking dialog over settings | default, delete pending, delete failure              |
| Boards index status message  | `/boards` after delete        | hidden, one-time `Board deleted.`                    |

## 10. Detailed Surface Specs

### Surface A: Board settings dialog

#### Purpose

Provide a single place to rename the current board and reach destructive board actions.

#### Exact copy

- Trigger label: `Board settings`
- Dialog title: `Board settings`
- Rename field label: `Board name`
- Primary action: `Save changes`
- Secondary action: `Cancel`
- Rename pending label: `Saving...`
- Destructive section heading: `Delete board`
- Destructive section body: `Deleting a board removes it from your normal board list and board routes.`
- Destructive action: `Delete board`

#### Validation copy

- Empty after trim: `Enter a board name.`
- Too long: `Board name must be 80 characters or fewer.`

#### Error copy

- Generic rename failure: `We couldn't save your changes. Try again.`

### Surface B: Discard-changes confirmation

#### Exact copy

- Title: `Discard changes?`
- Body: `You have unsaved board-name changes. Leave without saving?`
- Primary action: `Discard changes`
- Secondary action: `Keep editing`

### Surface C: Delete-board confirmation

#### Exact copy

- Title: `Delete board?`
- Body: `This board will be removed from your normal board list and board routes. This action can't be undone in this version.`
- Primary action: `Delete board`
- Secondary action: `Cancel`
- Pending label: `Deleting...`
- Failure copy: `We couldn't delete the board. Try again.`

## 11. Cross-Screen Interaction Rules

### Rename behavior

- Successful rename updates the loaded board header immediately.
- Successful rename does not close the settings dialog automatically.

### Delete behavior

- Successful delete always leaves the current board route and returns to `/boards`.
- Board delete is not undoable in this slice.
- Post-delete confirmation uses the `/boards` one-time status message rather than toast infrastructure.

### Announcement rules

- Rename success: `Board renamed.`
- Rename failure: `Board rename failed.`
- Delete success: `Board deleted.`

## 12. Undo and Redo Rules

- No action in this slice has a dedicated undo control.

## 13. Microcopy, Tone, and Announcement Strings

| Usage                | Key-like label                  | Exact string                                                                                                            |
| -------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Settings trigger     | `board.settings.trigger`        | `Board settings`                                                                                                        |
| Settings title       | `board.settings.title`          | `Board settings`                                                                                                        |
| Rename label         | `board.settings.rename.label`   | `Board name`                                                                                                            |
| Rename pending       | `board.settings.rename.pending` | `Saving...`                                                                                                             |
| Rename success       | `board.settings.rename.success` | `Board renamed.`                                                                                                        |
| Discard title        | `board.settings.discard.title`  | `Discard changes?`                                                                                                      |
| Delete section title | `board.settings.delete.heading` | `Delete board`                                                                                                          |
| Delete title         | `board.settings.delete.title`   | `Delete board?`                                                                                                         |
| Delete body          | `board.settings.delete.body`    | `This board will be removed from your normal board list and board routes. This action can't be undone in this version.` |
| Delete pending       | `board.settings.delete.pending` | `Deleting...`                                                                                                           |
| Delete success       | `board.settings.delete.success` | `Board deleted.`                                                                                                        |

## 14. Data Visible to the User

- Current board name
- Whether rename text is dirty
- Whether delete is pending or failed
- One-time post-delete status on `/boards`

## 15. Validation and Error Handling

### Client-side validation rules

- Board name is trimmed before validation and submission.
- Empty after trim is invalid.
- Board name over 80 characters is invalid.

### Backend-dependent errors that must map cleanly

- board rename failure
- board soft-delete failure
- auth/session failure delegated to the auth/session slice

## 16. Accessibility Requirements

- Board settings dialog traps focus, closes on `Escape`, and returns focus to the invoking settings control.
- Discard and delete confirmation dialogs trap focus and restore focus correctly.
- Rename input has a visible label.
- Success and failure states announce through a polite live region.
- Error and destructive states must not rely on color alone.

## 17. Responsive Behavior

- Board settings dialog becomes a full-width sheet or full-screen modal on narrow screens.
- Destructive actions stack vertically on narrow screens.
- The `/boards` post-delete status message remains visible near the top of the route on narrow screens.

## 18. Open Questions

1. Should future versions support a board archive separate from delete?
2. Should `/boards` eventually allow rename or delete directly from the board index, or stay board-route-only for destructive actions?

## 19. Acceptance Criteria

- A user can open board settings from a loaded board.
- A user can rename the board with explicit save.
- Unsaved board-name edits are not lost silently on close.
- A user can delete the board only after explicit confirmation.
- Successful delete returns the user to `/boards` and shows `Board deleted.`
- Board delete remains soft delete in backend behavior.

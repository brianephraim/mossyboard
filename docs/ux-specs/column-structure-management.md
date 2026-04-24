# Canonical UX Spec: Column Structure Management

## 1. Overview

This document defines the Kanban UX slice for creating columns and renaming existing columns inside a loaded board.

This spec is the parent artifact for later wireframe, frontend, and backend briefs. Those derived briefs must not change the behavior defined here.

### Constraint summary

- Authentication, session-expiry handling, and verification enforcement remain defined by [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md).
- The protected board shell and loaded board foundation remain defined by [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md).
- Card creation, card editing, and card detail behavior are defined separately in the card slices and should not be changed here.
- This slice uses the same approved frontend foundations already chosen for earlier slices:
  - `react-hook-form` for small single-field forms
  - `PrettyModalWrap` remains available for blocking confirmation flows if later needed, but this slice does not require a blocking dialog
- Drag-and-drop column reorder is out of scope for this slice and is defined separately.
- Column deletion remains intentionally out of scope until product semantics for contained cards are explicitly decided.

### Explicit non-goals for this slice

- Column reorder
- Column delete
- Card move, reorder, create, edit, or delete
- Filters and grouping
- Board settings or board delete

## 2. Slice Goal

Enable a user to shape the board structure by adding new columns and renaming existing columns without inventing title validation, insertion placement, or inline-edit behavior.

## 3. Users and Jobs to Be Done

### Primary actors

1. User expanding a board with a new workflow stage
2. User renaming a column so the board language better matches current work

### Jobs to be done

- "Let me add another column where it belongs."
- "Let me rename a column quickly without breaking the rest of the board."

## 4. In-Scope Tasks

- Add a column at the end of the board
- Add a column immediately after an existing column
- Cancel an in-progress column create flow
- Rename an existing column title inline
- Cancel an in-progress rename without saving
- Recover from validation errors and transient create or rename failures

## 5. Out-of-Scope Tasks

- Deleting a column
- Reordering columns
- Editing cards from within the column-management flow
- Choosing column colors, icons, or templates

## 6. Assumptions and Dependencies

- A loaded board exposes a persistent `Add column` action at the end of the current column sequence.
- Each column header also exposes an overflow action `Add column after`.
- Column creation asks for one field only: column title.
- New columns start empty and immediately use the existing empty-column presentation from the board shell slice.
- Column rename happens inline in the current column header rather than in a separate modal.
- Only one column create composer may be open per board at a time.
- Only one column rename editor may be open per board at a time.
- Opening a column create composer closes any existing clean rename editor.
- Opening a column rename editor closes any existing clean create composer.
- Unsaved text in a create composer or rename editor may be discarded by explicit `Cancel`; this slice does not require a blocking discard dialog.
- Column titles do not need to be unique within a board in this slice.
- Create-at-end and create-after-existing are the only insertion entry points in this slice.

## 7. Data-Scale Assumptions and Limits

- Column title: minimum 1 non-whitespace character after trimming, maximum 80 characters
- A board supports up to 30 visible columns without a dedicated column-structure overflow index in this slice
- One column create request may be in flight per board at a time
- One column rename request may be in flight per edited column at a time

## 8. Workflow Definitions

### Flow 1: Add a column at board end

- Trigger: User activates the board-end `Add column` action.
- User intent: Extend the board with another workflow stage at the far right.
- Preconditions: Board is loaded and editable.
- Steps:
  1. A create-column composer appears at the end of the current column sequence.
  2. The user enters a title.
  3. The user activates `Create column`.
  4. The composer enters a submitting state.
  5. On success, the composer closes and the new empty column appears at board end.
- System responses:
  - Focus moves to the new column heading after success.
  - Success is announced through the board live region.
- Failure cases:
  - Empty title
  - Overlong title
  - Network or server failure
- Postconditions:
  - Success: new empty column exists at board end
  - Failure: composer remains open with entered title preserved

### Flow 2: Add a column after an existing column

- Trigger: User activates `Add column after` from a column header overflow menu.
- User intent: Insert a new workflow stage in a specific place.
- Preconditions: Board is loaded and the source column is visible.
- Steps:
  1. The overflow menu closes.
  2. A create-column composer appears immediately after the chosen column.
  3. The user enters a title.
  4. The user activates `Create column`.
  5. On success, the composer closes and the new empty column appears in that position.
- System responses:
  - The board scrolls horizontally if needed so the inserted column is visible after success.
- Failure cases:
  - Same as Flow 1
- Postconditions:
  - Success: new empty column exists after the chosen column
  - Failure: composer remains open in place with entered title preserved

### Flow 3: Rename a column

- Trigger: User activates `Rename column` from a column header overflow menu.
- User intent: Change the column title without changing its cards or order.
- Preconditions: Board is loaded and the target column exists.
- Steps:
  1. The column title switches into inline edit mode.
  2. The current title is prefilled and selected.
  3. The user edits the title.
  4. The user activates `Save`.
  5. The rename request enters a pending state.
  6. On success, the header returns to read mode with the updated title.
- System responses:
  - `Save` is disabled until the edited title is valid and differs from the saved title.
  - `Cancel` discards the unsaved title and restores the prior saved title.
- Failure cases:
  - Empty title after trim
  - Overlong title
  - Network or server failure
  - Version conflict
- Postconditions:
  - Success: saved title is visible in the column header
  - Failure: inline edit mode remains open until the user retries or cancels

## 9. Screen and State Inventory

| Surface                    | Route / placement      | Required states                                                      |
| -------------------------- | ---------------------- | -------------------------------------------------------------------- |
| Board-end add-column slot  | end of loaded board    | idle trigger, composing, validation error, submitting, create error  |
| Insertion add-column slot  | after a visible column | idle trigger via menu, composing, validation error, submitting       |
| Column header title region | existing column header | read mode, inline edit mode, validation error, saving, save error    |
| Board live region          | protected board shell  | idle, create success, rename success, create failure, rename failure |

## 10. Detailed Surface Specs

### Surface A: Column create composer

#### Purpose

Provide a lightweight inline way to add a new column in a precise board position.

#### Exact copy

- Trigger label: `Add column`
- Overflow action label: `Add column after`
- Field label: `Column title`
- Placeholder: `Enter a column title`
- Primary action: `Create column`
- Secondary action: `Cancel`
- Pending label: `Creating column...`

#### Validation copy

- Empty after trim: `Enter a column title.`
- Too long: `Column title must be 80 characters or fewer.`

#### Error copy

- Generic create failure: `We couldn't create the column. Try again.`
- Network failure: `We couldn't reach the server. Check your connection and try again.`

#### Keyboard behavior

- `Enter` submits when the title is valid.
- `Escape` cancels when no request is pending.
- `Tab` order: title, create button, cancel button.

### Surface B: Inline column rename editor

#### Purpose

Let the user retitle a column in place without opening a separate surface.

#### Exact copy

- Overflow action label: `Rename column`
- Field label: `Column title`
- Primary action: `Save`
- Secondary action: `Cancel`
- Pending label: `Saving...`

#### Validation copy

- Empty after trim: `Enter a column title.`
- Too long: `Column title must be 80 characters or fewer.`

#### Error copy

- Generic rename failure: `We couldn't rename the column. Try again.`
- Conflict: `This column changed elsewhere. Reload the latest version and try again.`
- Conflict recovery action: `Reload latest`

#### Keyboard behavior

- `Enter` saves when the title is valid.
- `Escape` cancels and restores the saved title when no request is pending.

## 11. Cross-Screen Interaction Rules

### Create behavior

- Creating a column always produces an empty column.
- Create-at-end and create-after-existing use the same composer and validation rules.
- Starting one clean create flow closes any other clean create or rename flow.

### Rename behavior

- Rename changes only the column title.
- Rename does not change column order or any cards in that column.
- On version conflict, `Save` is disabled until the user reloads the latest value or cancels.

### Announcement rules

- Create success: `Column created.`
- Rename success: `Column renamed.`
- Create failure: `Column create failed.`
- Rename failure: `Column rename failed.`

## 12. Undo and Redo Rules

- No action in this slice has a dedicated undo control.

## 13. Microcopy, Tone, and Announcement Strings

| Usage              | Key-like label              | Exact string                                                              |
| ------------------ | --------------------------- | ------------------------------------------------------------------------- |
| Add-column trigger | `column.create.trigger`     | `Add column`                                                              |
| Add-after action   | `column.create.after`       | `Add column after`                                                        |
| Create field label | `column.create.label`       | `Column title`                                                            |
| Create placeholder | `column.create.placeholder` | `Enter a column title`                                                    |
| Create pending     | `column.create.pending`     | `Creating column...`                                                      |
| Create success     | `column.create.success`     | `Column created.`                                                         |
| Rename action      | `column.rename.action`      | `Rename column`                                                           |
| Rename pending     | `column.rename.pending`     | `Saving...`                                                               |
| Rename success     | `column.rename.success`     | `Column renamed.`                                                         |
| Rename conflict    | `column.rename.conflict`    | `This column changed elsewhere. Reload the latest version and try again.` |

## 14. Data Visible to the User

- Column title
- Whether a create composer is open
- Whether a rename editor is open
- Whether the target column is currently saving or in error

## 15. Validation and Error Handling

### Client-side validation rules

- Column title is trimmed before validation and submission.
- Empty after trim is invalid.
- Column title over 80 characters is invalid.

### Backend-dependent errors that must map cleanly

- column create failure
- column rename failure
- column rename conflict
- auth/session failure delegated to the auth/session slice

## 16. Accessibility Requirements

- Every create and rename control is keyboard-operable.
- The create composer and rename editor use visible labels.
- Overflow-menu actions that open create or rename flows have accessible names.
- Success and failure states announce through the board live region.
- Error and pending states must not rely on color alone.

## 17. Responsive Behavior

- On narrow screens, the create composer uses the full available column width.
- Inline rename remains in the column header region on desktop and mobile.
- Create and rename actions may stack vertically on narrow screens instead of overflowing horizontally.

## 18. Open Questions

1. Should future column management add templates or starter presets beyond a plain title-only flow?
2. Should boards eventually support more than 30 columns before introducing a dedicated column index or condensation pattern?
3. Column deletion remains intentionally unresolved and is deferred to a later slice.

## 19. Acceptance Criteria

- A user can add a new empty column at board end.
- A user can insert a new empty column after an existing column.
- A user can rename an existing column inline.
- Create and rename validation errors are explicit and keyboard-operable.
- Column create and rename failures keep the user in place with retry-capable recovery.
- Column titles remain non-unique and title-only in this slice.

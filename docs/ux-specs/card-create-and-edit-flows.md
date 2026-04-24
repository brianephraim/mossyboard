# Canonical UX Spec: Card Create and Edit Flows

## 1. Overview

This document defines the Kanban UX slice for creating cards inside a loaded board, editing the base card fields, and soft-deleting a card.

This spec is the parent artifact for later wireframe, frontend, and backend briefs. Those derived briefs must not change the behavior defined here.

### Constraint summary

- Authentication, session-expiry handling, and verification enforcement remain defined by [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md).
- The protected board shell, board-loading states, and read-only board foundation remain defined by [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md).
- This slice uses the same approved frontend foundations already chosen for earlier slices:
  - `react-hook-form` for card create and edit forms
  - `PrettyModalWrap` for blocking confirmation dialogs
- `priority` is the first concrete card attribute beyond title and description.
- This slice defines field behavior. The detail-surface container is specified in the sibling slice [`docs/ux-specs/card-detail-panel-or-modal.md`](./card-detail-panel-or-modal.md).
- Drag-and-drop, virtualization, filters, grouping, comments, attachments, and collaborator features remain out of scope here.

### Explicit non-goals for this slice

- Card move between columns
- Card reorder within a column
- Column creation, rename, reorder, or delete
- Subtask interactions
- Comments, tags, attachments, or activity history
- Undo or restore flows after card deletion

## 2. Slice Goal

Enable a user to create a card in a specific column, edit the card's core fields, and remove it from the board without inventing save, validation, or conflict behavior.

## 3. Users and Jobs to Be Done

### Primary actors

1. User adding a new piece of work to a column
2. User refining an existing card's title, description, or priority
3. User removing a card that is no longer needed

### Jobs to be done

- "Let me add a card exactly where I need it."
- "Let me edit the important card details without guessing when changes are saved."
- "Let me remove a card safely when it is no longer relevant."

## 4. In-Scope Tasks

- Start card creation from a populated column
- Start card creation from an empty column
- Create a title-first card in a specific column
- Cancel an in-progress create flow
- Edit card title, description, and priority from the detail surface
- Save edited card fields explicitly
- Discard unsaved field changes
- Soft-delete a card from the detail surface
- Recover from card validation errors, save failures, and version conflicts

## 5. Out-of-Scope Tasks

- Opening or structuring the detail surface container itself beyond what is needed for field behavior
- Managing subtasks
- Moving or reordering cards
- Filtering or grouping by priority
- Undoing deletion

## 6. Assumptions and Dependencies

- Cards are created from per-column `Add card` actions inside a loaded board.
- A newly created card is inserted at the end of the chosen column.
- The create flow asks only for card title. Description and priority are edited after creation.
- Only one inline card composer may be open across the board at a time.
- Editing happens inside the card detail surface defined by the sibling detail-surface spec.
- Card field edits use explicit save. There is no autosave in this slice.
- Card deletion is soft delete only.
- There is no undo after delete in this slice.
- Background board refresh must not silently overwrite dirty card field edits.

## 7. Data-Scale Assumptions and Limits

- Card title: minimum 1 non-whitespace character after trimming, maximum 200 characters
- Card description: maximum 10,000 characters
- Priority values: `none`, `low`, `medium`, `high`
- One create request may be in flight per board at a time
- One save request may be in flight per card detail surface at a time
- One delete request may be in flight per card detail surface at a time

## 8. Workflow Definitions

### Flow 1: Create a card from a populated column

- Trigger: User activates `Add card` within a column that already contains cards.
- User intent: Add another work item to that column.
- Preconditions: Board is loaded and the target column is visible.
- Steps:
  1. The inline composer opens at the end of the target column.
  2. The user enters a title.
  3. The user activates `Create card`.
  4. The composer enters a submitting state.
  5. On success, the composer closes and the new card appears at the bottom of the column.
- System responses:
  - If another composer is already open elsewhere on the board, it closes before the new one opens.
  - Focus moves to the new card tile after success.
- Failure cases:
  - Empty title
  - Overlong title
  - Network or server failure
- Postconditions:
  - Success: new card exists in the chosen column
  - Failure: composer stays open with entered title preserved

### Flow 2: Create a card from an empty column

- Trigger: User activates `Add card` from an empty column state.
- User intent: Add the first card to that column.
- Preconditions: Board is loaded and the target column has no visible cards.
- Steps:
  1. The inline composer replaces the empty-column placeholder.
  2. The user enters a title.
  3. The user activates `Create card`.
  4. On success, the first card appears and the empty placeholder disappears.
- System responses:
  - Success announcement is sent through the board live region.
- Failure cases:
  - Same as Flow 1
- Postconditions:
  - Success: column is no longer empty
  - Failure: empty-column create state remains visible

### Flow 3: Edit an existing card's core fields

- Trigger: User opens an existing card in the detail surface and changes title, description, or priority.
- User intent: Refine the card without moving it.
- Preconditions: Detail surface is open for a valid card.
- Steps:
  1. The user changes one or more editable fields.
  2. The form enters a dirty state.
  3. The user activates `Save changes`.
  4. The form enters a saving state.
  5. On success, the form returns to a clean state and the board card summary updates.
- System responses:
  - `Save changes` is disabled until the form is dirty and valid.
  - `Discard changes` is enabled only while the form is dirty and not saving.
- Failure cases:
  - Empty title after trim
  - Overlong title
  - Overlong description
  - Network or server failure
  - Version conflict
- Postconditions:
  - Success: latest saved values are visible in both detail surface and board summary
  - Failure: unsaved values remain visible until the user discards or reloads latest

### Flow 4: Close with unsaved field edits

- Trigger: User attempts to close the detail surface or open another card while current card fields are dirty.
- User intent: Leave the current card without saving.
- Preconditions: Card edit form is dirty and no save is in flight.
- Steps:
  1. The user triggers close or navigation away from the current card.
  2. A blocking discard-changes dialog opens.
  3. The user chooses `Discard changes` or `Keep editing`.
- System responses:
  - The detail surface remains open until the dialog decision is made.
- Failure cases:
  - none
- Postconditions:
  - `Discard changes`: unsaved edits are lost and the requested close/navigation proceeds
  - `Keep editing`: dialog closes and focus returns to the detail surface

### Flow 5: Delete a card

- Trigger: User activates `Delete card` from the detail surface.
- User intent: Remove the card from the board.
- Preconditions: Card detail surface is open for a valid card.
- Steps:
  1. A blocking delete-confirmation dialog opens.
  2. The user activates `Delete card`.
  3. The delete request enters a pending state.
  4. On success, the dialog closes, the detail surface closes, and the card disappears from the board.
- System responses:
  - Delete is not undoable in this slice.
  - Focus returns to the next logical board target after success.
- Failure cases:
  - Network or server failure
  - Version conflict
- Postconditions:
  - Success: card is removed from standard board reads
  - Failure: dialog remains open with retry-capable error

## 9. Screen and State Inventory

| Surface                         | Route / placement           | Required states                                                          |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| Column add-card trigger         | loaded board column         | idle, disabled while another create is submitting                        |
| Inline card composer            | end of column               | default, validation error, submitting, create failure                    |
| Empty-column add-card state     | empty column body           | default, composing, validation error, create failure                     |
| Card field form region          | card detail surface         | pristine, dirty, saving, saved, validation error, save failure, conflict |
| Discard-changes dialog          | blocking dialog over detail | default, closing with discard, keep-editing                              |
| Delete-card confirmation dialog | blocking dialog over detail | default, delete pending, delete failure, conflict                        |
| Board live region announcements | protected board shell       | idle, create success, save success, save failure, delete success         |

## 10. Detailed Surface Specs

### Surface A: Column add-card trigger and inline composer

#### Purpose

Provide the fastest board-local path to create a new card in a known column.

#### Entry conditions

- Board is loaded and the target column is visible.

#### Exact copy

- Trigger label: `Add card`
- Field label: `Card title`
- Placeholder: `Enter a title`
- Helper text: `You can add description and priority after the card is created.`
- Primary action: `Create card`
- Secondary action: `Cancel`
- Pending label: `Creating card...`

#### Validation copy

- Empty after trim: `Enter a card title.`
- Too long: `Card title must be 200 characters or fewer.`

#### Error copy

- Generic create failure: `We couldn't create the card. Try again.`
- Network failure: `We couldn't reach the server. Check your connection and try again.`

#### Success behavior

- Live-region announcement: `Card created.`
- New card receives focus after the board updates.

#### Keyboard behavior

- `Enter` submits from the title field.
- `Escape` cancels and closes the composer when not submitting.
- `Tab` order: title, create button, cancel button.

### Surface B: Card field form region

#### Purpose

Let the user edit the card's core fields once the detail surface is open.

#### Field definitions

| Field       | Label         | Default | Validation                             |
| ----------- | ------------- | ------- | -------------------------------------- |
| Title       | `Title`       | current | required after trim, max 200           |
| Description | `Description` | current | optional, max 10,000                   |
| Priority    | `Priority`    | current | one of `None`, `Low`, `Medium`, `High` |

#### Controls

| Control | Label             | Enabled state                             |
| ------- | ----------------- | ----------------------------------------- |
| Action  | `Save changes`    | enabled when dirty, valid, and not saving |
| Action  | `Discard changes` | enabled when dirty and not saving         |
| Action  | `Delete card`     | enabled when not saving                   |

#### Exact copy

- Dirty-state label: `Unsaved changes`
- Save pending label: `Saving...`
- Save success status: `Changes saved.`

#### Error copy

- Generic save failure: `We couldn't save your changes. Try again.`
- Network failure: `We couldn't reach the server. Check your connection and try again.`
- Conflict: `This card changed elsewhere. Reload the latest version and try again.`
- Conflict recovery action: `Reload latest`

#### Interaction rules

- The form remains editable after generic save failure.
- On conflict, `Save changes` is disabled until the user reloads the latest version.
- Reloading latest replaces local unsaved values with the freshest server values and clears the dirty state.

### Surface C: Discard-changes dialog

#### Exact copy

- Title: `Discard changes?`
- Body: `You have unsaved changes in this card. Leave without saving?`
- Primary action: `Discard changes`
- Secondary action: `Keep editing`

### Surface D: Delete-card confirmation dialog

#### Exact copy

- Title: `Delete card?`
- Body: `This card will be removed from the board. This action can't be undone in this version.`
- Primary action: `Delete card`
- Secondary action: `Cancel`
- Pending label: `Deleting...`
- Failure copy: `We couldn't delete the card. Try again.`

## 11. Cross-Screen Interaction Rules

### Create behavior

- Creating a card never opens the detail surface automatically in this slice.
- New cards are appended to the end of the chosen column.
- Opening another column composer closes the current composer and clears its unsaved create input.

### Save behavior

- Card field edits use explicit save. There is no autosave.
- Successful save updates the board card summary without requiring the user to close and reopen the card.
- Background board refresh does not overwrite dirty local field edits.

### Delete behavior

- Card deletion requires confirmation.
- Card deletion is not undoable in this slice.
- Successful delete closes the detail surface and removes the card from the board.

### Announcement rules

- Create success: `Card created.`
- Save success: `Changes saved.`
- Save failure: `Card save failed.`
- Delete success: `Card deleted.`

### Tone rules

- Use sentence case throughout.
- Keep validation and error copy direct and recoverable.

## 12. Undo and Redo Rules

- No action in this slice is undoable.

## 13. Microcopy, Tone, and Announcement Strings

| Usage               | Key-like label            | Exact string                                                                             |
| ------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| Add-card trigger    | `card.create.trigger`     | `Add card`                                                                               |
| Create title helper | `card.create.helper`      | `You can add description and priority after the card is created.`                        |
| Create pending      | `card.create.pending`     | `Creating card...`                                                                       |
| Create success      | `card.create.success`     | `Card created.`                                                                          |
| Dirty label         | `card.edit.dirty`         | `Unsaved changes`                                                                        |
| Save pending        | `card.edit.pending`       | `Saving...`                                                                              |
| Save success        | `card.edit.success`       | `Changes saved.`                                                                         |
| Save conflict       | `card.edit.conflict`      | `This card changed elsewhere. Reload the latest version and try again.`                  |
| Discard title       | `card.edit.discard.title` | `Discard changes?`                                                                       |
| Discard body        | `card.edit.discard.body`  | `You have unsaved changes in this card. Leave without saving?`                           |
| Delete title        | `card.delete.title`       | `Delete card?`                                                                           |
| Delete body         | `card.delete.body`        | `This card will be removed from the board. This action can't be undone in this version.` |
| Delete pending      | `card.delete.pending`     | `Deleting...`                                                                            |
| Delete success      | `card.delete.success`     | `Card deleted.`                                                                          |

## 14. Data Visible to the User

- Card title
- Card description
- Card priority
- Whether the card has unsaved field edits

## 15. Validation and Error Handling

### Client-side validation rules

- Title is trimmed before validation and submission.
- Empty after trim is invalid.
- Title over 200 characters is invalid.
- Description over 10,000 characters is invalid.

### Backend-dependent errors that must map cleanly

- card create failure
- card update failure
- card delete failure
- version conflict on update or delete
- auth/session failure delegated to the auth/session slice

## 16. Accessibility Requirements

- Every card create and edit control is keyboard-operable.
- The create field and edit fields have visible labels.
- Both confirmation dialogs trap focus, close on `Escape`, and restore focus on close.
- Live-region announcements are used for create, save, and delete outcomes.
- Color is never the sole signal for dirty, error, or conflict state.

## 17. Responsive Behavior

- Inline create composer remains within the column flow on desktop and mobile.
- The create composer uses full available column width on mobile.
- Dialog actions stack vertically on narrow screens.
- The editable field behaviors remain the same whether the detail container is a desktop panel or mobile modal.

## 18. Open Questions

1. Should future rapid-entry work keep the inline composer open after each successful create, or is close-after-create the long-term default?
2. Should priority remain a four-option fixed set, or can later slices introduce custom statuses separate from column placement?

## 19. Acceptance Criteria

- A user can create a title-only card from any loaded column.
- A user can create the first card in an empty column.
- Create validation and failure states are explicit and keyboard-operable.
- A user can edit card title, description, and priority with explicit save.
- Dirty edits are not lost silently on close.
- Version conflicts surface a clear reload-latest recovery path.
- Card deletion requires confirmation and removes the card from standard board reads.

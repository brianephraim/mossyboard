# Wireframe Brief: Card Create and Edit Flows

## 1. Source of Truth

This brief is derived from [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md) only. Do not change product behavior while designing wireframes.

## 2. Slice Objective

Visualize how a user creates a card in a column, edits core card fields, discards unsaved changes, and deletes a card.

## 3. Scope for the Wireframe Agent

Include only:

- column-level card creation
- card field edit states
- discard-changes and delete-confirmation dialogs

Do not design:

- drag-and-drop
- column creation or reorder
- subtask management
- comments, tags, or attachments

## 4. Behavior Constraints to Preserve

- Card creation happens inline inside a column
- Creation asks only for title
- Editing uses explicit save
- Deletion is soft delete with confirmation
- No undo exists in this slice
- Detail-surface container layout is defined by the sibling detail-surface slice

## 5. User Flows to Visualize

1. Create card from populated column
2. Create first card in empty column
3. Edit card fields in dirty and saved states
4. Hit a save conflict and show reload-latest recovery
5. Attempt to close with unsaved changes
6. Delete a card with confirmation

## 6. Screens to Design

| ID  | Screen                          | Required variants                  |
| --- | ------------------------------- | ---------------------------------- |
| A1  | Inline create composer          | default                            |
| A2  | Inline create composer          | validation or generic create error |
| B1  | Empty-column create state       | default                            |
| C1  | Card field form region          | pristine                           |
| C2  | Card field form region          | dirty                              |
| C3  | Card field form region          | conflict                           |
| D1  | Discard-changes dialog          | default                            |
| E1  | Delete-card confirmation dialog | default                            |
| E2  | Delete-card confirmation dialog | delete failure                     |

## 7. Required Copy

- `Add card`
- `Card title`
- `Enter a title`
- `Create card`
- `Cancel`
- `You can add description and priority after the card is created.`
- `Unsaved changes`
- `Save changes`
- `Discard changes`
- `Delete card`
- `This card changed elsewhere. Reload the latest version and try again.`

## 8. Annotations to Show

- exact state label
- initial focus target
- keyboard path
- live-region announcements
- what happens to focus after create success or delete success
- which parts belong to the detail surface container versus this slice's field behavior

## 9. Responsive Notes

- Inline composer stays inside the column on desktop and mobile
- Confirmation dialogs stack actions vertically on narrow screens
- Card field form should be shown as container-agnostic so it can live inside either a desktop panel or mobile modal

## 10. Accessibility Callouts

- Visible labels for title, description, and priority
- `Escape` behavior for dialogs
- focus restoration after dialogs
- non-color dirty and conflict signals

## 11. Open Design Questions

1. How visually prominent should the dirty-state indicator be?
2. Should the inline create composer feel lightweight and almost card-like, or more obviously form-like?

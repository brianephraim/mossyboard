# Wireframe Brief: Card Detail Panel or Modal

## 1. Source of Truth

This brief is derived from [`docs/ux-specs/card-detail-panel-or-modal.md`](./card-detail-panel-or-modal.md) and the sibling field-behavior spec [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md). Do not change product behavior while designing wireframes.

## 2. Slice Objective

Visualize the route-driven card detail surface, including desktop panel and mobile modal behavior, plus the first in-scope detail feature: subtasks.

## 3. Scope for the Wireframe Agent

Include only:

- card open and close states tied to the board route
- desktop right-side panel presentation
- mobile full-screen modal presentation
- detail loading, retryable-error, and not-available states
- subtask empty, populated, create, edit, toggle, and delete states
- the placement of the sibling card field form region inside the detail surface

Do not design:

- card move or reorder controls
- column editing controls
- comments, tags, attachments, or activity feed UI
- subtask reorder UI
- new delete-confirmation behavior beyond what the sibling card-create-and-edit slice already defines

## 4. Behavior Constraints to Preserve

- Card selection is represented by the `card` search param on `/boards/$boardId`.
- Desktop card details use a right-side panel.
- Mobile card details use a full-screen modal.
- Desktop panel is non-modal and can be reused to switch from one clean card to another.
- Mobile modal blocks background board interaction until close.
- Unsaved card-field or subtask text uses the existing discard-changes dialog before close or desktop card-switch.
- Subtasks are the first and only additional detail feature in this slice.
- Completed subtasks stay inline and do not auto-move to the bottom.

## 5. User Flows to Visualize

1. Open card detail from a loaded board on desktop
2. Open card detail from a loaded board on mobile
3. View card-detail loading state
4. View retryable load-failure state
5. View neutral not-available state
6. View loaded card with empty subtasks
7. Add first subtask
8. Edit an existing subtask title
9. Toggle a subtask complete
10. Delete a subtask
11. Close details and return to the board

## 6. Screens to Design

| ID  | Screen                            | Required variants                                                       |
| --- | --------------------------------- | ----------------------------------------------------------------------- |
| A1  | Desktop board with detail panel   | loaded, empty subtasks                                                  |
| A2  | Desktop detail panel              | retryable load error                                                    |
| A3  | Desktop detail panel              | neutral not-available state                                             |
| A4  | Desktop detail panel              | loaded with subtask row edit open                                       |
| B1  | Mobile full-screen detail modal   | loaded, empty subtasks                                                  |
| B2  | Mobile full-screen detail modal   | loading                                                                 |
| B3  | Mobile full-screen detail modal   | loaded with add-subtask composer open                                   |
| C1  | Subtask row                       | complete                                                                |
| C2  | Subtask row                       | mutation failure or conflict                                            |
| D1  | Detail close with unsaved changes | reference the sibling discard-changes dialog rather than redesigning it |

## 7. Required Copy

- `Card details`
- `Close details`
- `Column`
- `Loading card...`
- `We couldn't load this card.`
- `Try again or close details.`
- `This card isn't available anymore.`
- `Subtasks`
- `No subtasks yet.`
- `Add subtask`
- `Subtask title`
- `What needs to be done?`
- `Edit subtask`
- `Save subtask`
- `Delete subtask`
- `{{doneCount}} of {{totalCount}} completed`

## 8. Annotations to Show

- exact route or state label, including `?card=...`
- initial focus target
- focus return target on close
- difference between desktop non-modal panel and mobile modal behavior
- how browser back should affect the detail surface
- which parts of the loaded surface are owned by the sibling card-create-and-edit slice
- live-region announcements for load and subtask actions

## 9. Responsive Notes

- Desktop panel should preserve visible board context behind it.
- Mobile modal should behave as a full-screen detail takeover with a persistent close control.
- Subtask row actions may wrap or stack on narrow screens.
- The card field form region and subtask section remain vertically stacked on mobile.

## 10. Accessibility Callouts

- Desktop side panel needs a clear heading and close control.
- Mobile modal traps focus and returns focus after close.
- Subtask controls need visible labels or accessible names.
- Completed and error states must not rely on color alone.
- The sibling discard-changes dialog is reused for unsaved text loss prevention.

## 11. Open Design Questions

1. How visually separated should the card field form region and subtask section feel inside the same surface?
2. Should the desktop panel feel lightweight and board-adjacent, or more like a dense inspector pane?

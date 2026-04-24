# Wireframe Brief: Board Shell and Board Loading States

## 1. Source of Truth

This brief is derived from [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md) only. Do not change product behavior while designing wireframes.

## 2. Slice Objective

Visualize the protected board experience so a signed-in user can:

- understand the protected shell
- see the `/boards` home route
- create a board when none exists
- open a board
- understand the loading, empty, error, and not-available board states

## 3. Scope for the Wireframe Agent

Include only the board-shell and board-loading slice.

Do not design:

- card creation UI
- card detail UI
- column create or reorder controls
- drag-and-drop affordances
- filters or grouping controls
- board settings, rename, archive, or delete flows

The loaded board is read-only in this slice. Card tiles are visible content summaries, not an interaction design problem yet.

## 4. Behavior Constraints to Preserve

- `/boards` is a real protected index route, not an automatic redirect
- `/boards/$boardId` is the protected board-detail route
- The protected shell header always contains:
  - brand link `Kanban`
  - primary nav link `Boards`
  - `Create board`
  - `Sign out`
- The verification reminder banner from the auth/session slice appears below the shell header when `REQUIRE_EMAIL_VERIFICATION=off` and the user is still unverified
- If `REQUIRE_EMAIL_VERIFICATION=on`, the user does not reach these board-shell surfaces at all
- `Create board` opens a dialog with one field: `Board name`
- Successful board creation opens a new board with the default columns:
  - `To do`
  - `In progress`
  - `Done`
- Board cards and columns are read-only in this slice
- Background board refresh keeps existing content visible

## 5. User Flows to Visualize

1. Enter `/boards` and see boards loading
2. Enter `/boards` and see existing boards
3. Enter `/boards` with no boards yet
4. Create a board from the empty state or shell header
5. Open an existing board from `/boards`
6. See the board-detail loading skeleton
7. See a loaded board with cards
8. See a loaded board with zero cards
9. Recover from a board-detail transient load error
10. Recover from a not-available board id

## 6. Screens to Design

### Required full wireframes

| ID  | Screen              | Why it needs a frame                              | Required variants              |
| --- | ------------------- | ------------------------------------------------- | ------------------------------ |
| A1  | Boards home         | Route-entry loading is core to this slice         | desktop loading                |
| A2  | Boards home         | Main protected index route                        | desktop loaded list            |
| A3  | Boards home         | First-run experience needs explicit handling      | desktop no-boards empty        |
| A4  | Boards home         | Failure recovery must be visible                  | error state                    |
| B1  | Create board dialog | Core creation entry point                         | default desktop                |
| B2  | Create board dialog | Validation and failure handling should be visible | validation or generic error    |
| C1  | Board detail        | Route loading must be explicit                    | desktop loading skeleton       |
| C2  | Board detail        | Baseline loaded board state                       | desktop loaded with cards      |
| C3  | Board detail        | Empty-card board should not look broken           | desktop loaded with zero cards |
| C4  | Board detail        | Transient read failure needs recovery UI          | load error                     |
| C5  | Board detail        | Missing/inaccessible board needs neutral handling | not available                  |
| D1  | Boards home         | Mobile shell and list behavior must be explicit   | mobile loaded list             |
| D2  | Board detail        | Mobile loading differs from desktop               | mobile loading                 |
| D3  | Board detail        | Mobile board columns stack vertically             | mobile loaded with cards       |

### States that may be annotation-only unless the layout changes materially

- boards-home list skeleton row count
- shell header with verification reminder visible
- create-board submitting state: `Creating board...`
- sign-out pending state: `Signing out...`
- board background refresh status: `Refreshing board...`
- board background refresh error: `We couldn't refresh the board. Showing the last loaded view.`

## 7. What Each Screen Must Show

### A. Protected board shell

- Brand link: `Kanban`
- Primary nav: `Boards`
- Header actions: `Create board`, `Board settings` when present on `/boards/$boardId`, `Sign out`
- A clear main content container below the header
- Verification reminder banner placement directly below the header when shown

### B. Boards home

- Heading: `Boards`
- Supporting text: `Open a board or create a new one.`
- Loaded-list variant:
  - list of boards ordered most recently updated first
  - each board row shows board name and summary text in the pattern `3 columns · 8 cards`
- Empty variant:
  - heading `No boards yet`
  - body `Create your first board to start organizing work.`
  - action `Create board`
- Error variant:
  - heading `We couldn't load your boards`
  - body `Try again to reload your boards.`
  - action `Retry`

### C. Create board dialog

- Title: `Create board`
- Body: `Give this board a short name. New boards start with To do, In progress, and Done.`
- Field label: `Board name`
- Placeholder: `Sprint planning`
- Primary action: `Create board`
- Secondary action: `Cancel`
- Show where form-level errors appear

### D. Board detail loading

- Back link: `Back to boards`
- Visible status text: `Loading board...`
- Board title placeholder
- Board summary placeholder
- Three placeholder columns with four placeholder cards each

### E. Loaded board detail

- Back link: `Back to boards`
- Board title
- Summary text in the pattern `3 columns · 8 cards`
- Optional zero-card helper: `Cards will appear here once they are added.`
- Column title and card-count text
- Card tiles with title and optional description preview
- Empty-column body when needed: `No cards yet.`

### F. Board-detail load error

- Heading: `We couldn't load this board`
- Body: `Try again to reload this board.`
- Actions: `Retry`, `Back to boards`

### G. Board not available

- Heading: `This board isn't available`
- Body: `It may have been deleted or you may not have access to it anymore.`
- Actions: `Back to boards`, `Create board`

## 8. Annotations to Show on the Wireframes

- Exact route or state label on every frame
- Primary user goal for the frame
- Initial focus target
- Key keyboard behavior
- Live-region announcements for async outcomes
- Whether the verification reminder is visible
- Which controls stay visible during route loading
- Which parts of the loaded board are read-only in this slice
- Which states are transient versus persistent

## 9. Interaction Notes

- The shell header persists while route content changes inside `/boards*`.
- The verification reminder, when shown, belongs below the shell header rather than inside the board canvas.
- `Create board` is globally available from the shell header.
- Successful create-board closes the dialog and routes to the new board.
- Initial board-route load uses the skeleton view.
- Background refresh keeps the loaded board visible.
- The not-available state must not imply whether another user owns the board.

## 10. Responsive Notes

- The shell header may wrap but must not cause horizontal scrolling.
- The boards-home route remains a single vertical list on mobile.
- Board-detail columns stack vertically below 1024 px.
- Board-detail columns sit side by side in a horizontally scrollable canvas at 1024 px and above.
- Empty and error state actions stack vertically on narrow screens.
- The create-board dialog becomes a full-width sheet or full-screen modal on narrow screens.

## 11. Accessibility Callouts

- All header controls and route actions must be keyboard-operable.
- The create-board dialog traps focus, closes on `Escape`, and returns focus on close.
- Show where the live region lives for loading, create, and refresh announcements.
- Loading skeleton shapes should be treated as decorative; the status text carries meaning.
- Column sections in the loaded board must have a clear focus treatment because they are the keyboard path through the board canvas in this slice.

## 12. Visual and Tone Guidance

- Keep the shell calm, practical, and task-first.
- Use sentence case throughout.
- Do not make the board look finished beyond this slice; later specs will add card, column, and filter behaviors.
- The loaded board can feel structured and intentional, but it should not imply drag-and-drop, detail drawers, or hidden controls that the spec does not define.

## 13. Items Intentionally Left Open for Design Exploration

- Whether the boards-home route feels more like a compact table/list or a roomy stack of board cards
- How visually prominent the `Create board` action should be in the shell header
- The precise visual treatment of the back-link row on board-detail screens
- The visual style of the read-only card tiles before interactive card behavior is specified

## 14. Open Design Questions

1. Should the boards-home route feel more like a directory page or more like a lightweight dashboard?
2. How strong should the visual separation be between the protected shell header and the verification reminder banner?
3. On desktop, should the loaded board feel dense and workmanlike, or slightly more spacious and editorial?

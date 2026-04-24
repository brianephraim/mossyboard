# Canonical UX Spec: Board Shell and Board Loading States

## 1. Overview

This document defines the next Kanban UX slice after auth: the protected board shell, the `/boards` home route, the first board-creation entry point, and the loading, empty, error, and not-available states for `/boards` and `/boards/$boardId`.

This spec is the parent artifact for later wireframe, frontend, and backend briefs. Those derived briefs must not change the behavior defined here.

### Constraint summary

- Authentication, verification gating, session-expired behavior, and sign-out semantics remain defined by [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md).
- Firebase remains auth-only. All board data access still goes through tRPC and the server boundary.
- TanStack Start, TanStack Router, TanStack Query, Redux Toolkit, and Tamagui remain the app foundations.
- Use the same approved frontend approach already chosen for auth where relevant:
  - `react-hook-form` for the create-board form
  - `PrettyModalWrap` for the create-board dialog
- Do not introduce drag-and-drop, virtualization, or filter libraries in this slice. Those remain for later Kanban slices.
- Interactive elements must be keyboard-operable, mobile-usable, and accessible without relying on color alone.
- No existing screenshots or visual references were provided for this slice at authoring time.

### Explicit non-goals for this slice

- Card create, edit, delete, or move behavior
- Card detail panel or modal behavior
- Column creation, rename, reorder, or delete behavior
- Filters and grouping controls
- Board rename, archive, delete, or settings flows
- Collaboration and multi-owner board behavior
- Toast, undo, or bulk-action patterns beyond inline shell feedback

## 2. Slice Goal

Enable an authenticated user to enter the protected board area, understand where they are, create a board when none exists, open an existing board, and recover from board-loading failures without the app becoming blank or ambiguous.

## 3. Users and Jobs to Be Done

### Primary actors

1. Returning signed-in user who already has one or more boards
2. First-time signed-in user who has no boards yet
3. Signed-in user following a direct link to a board
4. Signed-in user whose board data fails to load

### Jobs to be done

- "Take me to my boards once I am signed in."
- "If I do not have a board yet, give me one clear way to create one."
- "If a board is still loading, show me that clearly instead of a blank page."
- "If a board cannot be opened, tell me what happened and what I can do next."

## 4. In-Scope Tasks

- Enter the protected `/boards` route after passing auth and verification checks
- View the protected board shell shared by `/boards` and `/boards/$boardId`
- View the boards home route with a list of owned boards
- View the boards home route when no boards exist yet
- Create a board with name-only input
- Open an owned board from the boards home route
- View the board route loading skeleton
- View a loaded board with read-only columns and card summaries
- View empty-column states inside a loaded board
- Retry after a boards-home load failure
- Retry after a board-detail load failure
- Recover from a not-found, deleted, or inaccessible board route
- Return from a board route to the boards home route
- See the verification reminder banner in its final shell placement when verification is not required
- Sign out from the protected board shell

## 5. Out-of-Scope Tasks

- Creating, editing, deleting, or moving cards
- Opening card details
- Editing column structure
- Filtering or grouping the board
- Searching boards
- Board templates beyond one fixed default starter template
- Profile settings or account management beyond the existing sign-out behavior

## 6. Assumptions and Dependencies

- Protected board home route: `/boards`
- Protected board detail route pattern: `/boards/$boardId`
- `/boards` is a real route that lists boards. It is not an automatic redirect to the most recent board.
- The auth/session slice remains authoritative for:
  - unauthenticated redirects
  - session-expired handling
  - email-verification enforcement
  - verification reminder copy and behavior
  - sign-out outcome and copy
- If `REQUIRE_EMAIL_VERIFICATION` is off and the user is still unverified, the verification reminder banner appears below the protected shell header on both `/boards` and `/boards/$boardId`.
- If `REQUIRE_EMAIL_VERIFICATION` is on, unverified users do not reach this slice. They are routed to `/verify-email` by the auth/session rules.
- The create-board entry point is available from the protected shell header and from the no-boards empty state.
- The create-board flow uses one field: board name.
- Board names do not need to be unique per owner in this slice.
- A newly created board starts with three default columns:
  - `To do`
  - `In progress`
  - `Done`
- Card and column content is read-only in this slice. Card tiles do not yet open a detail surface, and columns do not yet expose create or reorder controls.

## 7. Data-Scale Assumptions and Limits

- Board name input: minimum 1 non-whitespace character after trimming, maximum 80 characters
- Boards home route: supports up to 100 boards in one scrollable list without pagination in this slice
- Boards list ordering: most recently updated boards appear first
- Board detail loading skeleton: render at most 3 placeholder columns with 4 placeholder cards each regardless of actual board size
- Card description preview in board detail: maximum 140 visible characters or 2 lines, whichever is reached first
- Column card-count display: show exact count from `0` to `999`; show `999+` above that
- This slice does not introduce list virtualization, board search, filters, or grouping behavior

## 8. Workflow Definitions

### Flow 1: Enter boards home after auth

- Trigger: User reaches `/boards` after successful sign-in, direct navigation, or a protected-route redirect that resolved successfully.
- User intent: See available boards and choose what to open next.
- Preconditions: User is authenticated and, if verification is enforced, already verified.
- Steps:
  1. The protected shell header renders immediately.
  2. The boards-home query starts.
  3. While data is loading, the main content area shows the boards-home loading state.
  4. If the user has boards, the list renders in updated-descending order.
  5. If the user has no boards, the no-boards empty state renders with a `Create board` action.
- System responses:
  - If the verification reminder applies, it appears below the shell header before the main content.
  - The shell header remains visible during loading instead of blanking the route.
- Failure cases:
  - Boards-home read fails because of a transient server or network issue.
  - Auth becomes invalid while reading; the auth/session slice takes over.
- Postconditions:
  - Success with boards: user can open a board.
  - Success with no boards: user can create the first board.
  - Failure: user sees the boards-home error state with retry.

### Flow 2: Create a board

- Trigger: User activates `Create board` from the protected shell header or the no-boards empty state.
- User intent: Create a board and start using the Kanban area.
- Preconditions: User is on a protected board route and authenticated.
- Steps:
  1. The create-board dialog opens.
  2. The user enters a board name.
  3. The user activates `Create board`.
  4. The dialog enters a submitting state.
  5. On success, the dialog closes.
  6. The app routes to the new `/boards/$boardId` route.
  7. The new board route loads with the standard board-detail loading state, then the loaded board state.
- System responses:
  - The submit button is disabled during the request.
  - The create-board mutation creates the default starter columns before the board is shown.
  - Successful creation announces completion through a polite live region before or as the route changes.
- Failure cases:
  - Empty or whitespace-only board name
  - Board name exceeds the maximum length
  - Network or server failure during create
- Postconditions:
  - Success: the new board opens with default columns and no cards
  - Failure: the dialog remains open with the entered name preserved

### Flow 3: Open an existing board from boards home

- Trigger: User activates a board entry on `/boards`.
- User intent: Open that board and continue work.
- Preconditions: Board belongs to the signed-in user and is not soft-deleted.
- Steps:
  1. The user selects a board entry.
  2. The app routes to `/boards/$boardId`.
  3. The protected shell header stays mounted.
  4. The main content area shows the board-detail loading state.
  5. On success, the loaded board view replaces the skeleton.
- System responses:
  - Direct route transitions do not blank the full screen.
  - The `Boards` navigation link remains available while loading.
- Failure cases:
  - The board no longer exists or is no longer accessible.
  - The board read fails because of a transient server or network issue.
- Postconditions:
  - Success: loaded board view is visible
  - Failure, not available: not-available state is visible
  - Failure, transient: retryable board-load error state is visible

### Flow 4: Open a board from a direct link

- Trigger: User lands directly on `/boards/$boardId`.
- User intent: Open a specific board without first visiting the board index.
- Preconditions: User is authenticated and allowed to access protected board routes.
- Steps:
  1. The protected shell header renders.
  2. The board-detail query starts.
  3. The main content area shows the board-detail loading state.
  4. If the read succeeds, the loaded board state renders.
  5. If the read reports not found or inaccessible, the not-available state renders.
  6. If the read fails transiently, the board-load error state renders.
- System responses:
  - The user always has a path back to `/boards`.
  - Verification reminder placement remains consistent with other protected board routes.
- Failure cases:
  - Not found or soft-deleted board
  - Board owned by another user
  - Network or server failure
- Postconditions:
  - Success: loaded board visible
  - Failure: user can retry or return to `/boards`

### Flow 5: Recover from boards-home load failure

- Trigger: Boards-home read fails before the route has usable data.
- User intent: Retry and reach the board list or no-boards state.
- Preconditions: User is on `/boards`.
- Steps:
  1. The error state renders with retry guidance.
  2. The user activates `Retry`.
  3. The route returns to the boards-home loading state.
  4. If the read succeeds, the list or empty state appears.
- System responses:
  - Retry does not unmount the protected shell header.
  - Retry failure keeps the error state visible.
- Failure cases:
  - Repeat server or network failure
- Postconditions:
  - Success: list or no-boards state visible
  - Failure: error state remains visible

### Flow 6: Recover from board-detail load failure

- Trigger: Board-detail read fails before the route has usable board data.
- User intent: Retry loading the intended board or leave the route.
- Preconditions: User is on `/boards/$boardId`.
- Steps:
  1. The board-load error state renders.
  2. The user activates `Retry` to attempt the same board again, or `Back to boards` to leave the route.
  3. On retry, the main content returns to the board-detail loading state.
  4. If the retry succeeds, the loaded board state appears.
- System responses:
  - The shell header remains visible.
  - Repeated failures keep the retry path available.
- Failure cases:
  - Repeat server or network failure
- Postconditions:
  - Success: loaded board visible
  - Failure: error state remains visible or the user leaves to `/boards`

### Flow 7: Refresh a loaded board

- Trigger: The currently viewed board refetches in the background after a mutation elsewhere, window refocus, or explicit retry from the inline refresh error.
- User intent: Keep working context while the board catches up.
- Preconditions: A previously loaded board is already visible.
- Steps:
  1. The board remains visible.
  2. A non-blocking refresh status appears.
  3. If the refresh succeeds, the status clears.
  4. If the refresh fails, the stale board remains visible and an inline refresh error appears with `Retry`.
- System responses:
  - Background refresh never replaces loaded content with the full-route skeleton.
  - The live region announces refresh start and refresh failure.
- Failure cases:
  - Transient server or network failure during refetch
- Postconditions:
  - Success: refreshed content visible
  - Failure: stale content remains visible with retry-capable inline error

## 9. Screen and State Inventory

| Surface                 | Route / placement     | Required states                                                                  |
| ----------------------- | --------------------- | -------------------------------------------------------------------------------- |
| Protected board shell   | `/boards*`            | desktop default, mobile default, verification reminder visible, sign-out pending |
| Boards home             | `/boards`             | loading, loaded list, no-boards empty, error                                     |
| Create board dialog     | modal over `/boards*` | default, field error, submit pending, create failure                             |
| Board detail loading    | `/boards/$boardId`    | initial loading skeleton                                                         |
| Board detail loaded     | `/boards/$boardId`    | loaded with cards, loaded with no cards, background refreshing, refresh failure  |
| Board detail load error | `/boards/$boardId`    | error, retry pending                                                             |
| Board not available     | `/boards/$boardId`    | not found, deleted, inaccessible                                                 |
| Global live region      | app shell             | idle, announces async status                                                     |

## 10. Detailed Surface Specs

### Surface A: Protected board shell

#### Purpose

Provide the shared protected frame for all board routes and resolve the final placement of sign-out and the verification reminder banner.

#### Entry conditions

- User reaches any `/boards*` route while authenticated and allowed to access protected board content.

#### Layout regions

1. Global header
2. Optional verification reminder banner region
3. Main content region
4. Global polite live region

#### Header content

| Region        | Content / control | Label          | Behavior                            |
| ------------- | ----------------- | -------------- | ----------------------------------- |
| Brand link    | link              | `Kanban`       | Routes to `/boards`                 |
| Primary nav   | link              | `Boards`       | Routes to `/boards`                 |
| Header action | button            | `Create board` | Opens the create-board dialog       |
| Header action | button            | `Sign out`     | Uses the auth/session sign-out flow |

#### Interaction rules

- The shell header stays mounted while main content moves between loading, loaded, empty, error, and not-available states.
- The verification reminder banner, when applicable, renders immediately below the header and above the page-specific main content.
- The shell never invents a separate account menu in this slice. `Sign out` is a visible header action.
- The shell reuses the exact verification reminder strings and behaviors from the auth/session spec.

#### Loading / error / success behavior

- Sign-out pending label: `Signing out...`
- Shell itself has no full-screen loading state.
- Async status announcements are emitted through one dedicated live region.

#### Keyboard behavior

- Header tab order: `Kanban`, `Boards`, `Create board`, `Sign out`
- The verification banner appears in tab order after the header when visible.

#### Focus behavior

- When a protected board route is entered directly, focus lands on that route's main heading rather than on the shell header.
- When sign-out fails, focus moves to the sign-out error message source defined by the auth/session slice.

#### Mobile behavior

- The header remains one persistent region.
- If width is too narrow for one row, header items wrap onto a second row rather than causing horizontal scrolling.

#### Accessibility notes

- Use header, nav, and main landmarks.
- The verification banner remains non-modal and does not trap focus.
- The live region is mounted once for all protected board routes.

### Surface B: Boards home

#### Purpose

Let the user see their available boards, understand when none exist, and create or open a board.

#### Entry conditions

- `/boards`

#### Content hierarchy

1. Heading: `Boards`
2. Supporting text: `Open a board or create a new one.`
3. One of:
   - boards list
   - no-boards empty state
   - boards-home error state

#### Loaded list behavior

- List entries are ordered by most recently updated first.
- Each entry shows:
  - board name
  - summary text in the format `<columnCount> columns · <cardCount> cards`
- Each entry opens the board detail route when activated.

#### Exact copy

- Heading: `Boards`
- Supporting text: `Open a board or create a new one.`
- Loading status text: `Loading boards...`
- Empty-state heading: `No boards yet`
- Empty-state body: `Create your first board to start organizing work.`
- Error heading: `We couldn't load your boards`
- Error body: `Try again to reload your boards.`
- Retry button: `Retry`

#### Controls

| Control            | Label          | Behavior                      |
| ------------------ | -------------- | ----------------------------- |
| Empty-state action | `Create board` | Opens the create-board dialog |
| Error action       | `Retry`        | Re-runs the boards-home read  |
| Board list entry   | board name     | Routes to `/boards/$boardId`  |

#### Loading / empty / error / success behavior

- Loading state:
  - heading and supporting text remain visible
  - list area shows 4 skeleton rows
  - live-region announcement: `Loading boards.`
- Empty state:
  - renders under the normal heading and supporting text
  - no placeholder board list rows remain visible
- Error state:
  - replaces the list area
  - activating `Retry` returns the list area to the loading state
- This surface has no standalone success confirmation.

#### Keyboard behavior

- `Tab` order moves through shell controls before reaching route content.
- Board list entries are focusable in visual order.
- `Enter` or `Space` activates the focused board entry.

#### Focus behavior

- Direct route entry focuses the `Boards` heading.
- If `Retry` fails again, focus moves to the error heading.

#### Mobile behavior

- Board list remains a single vertical list.
- Board summary text may wrap to a second line.

#### Accessibility notes

- Each board entry must expose an accessible name that includes the board name.
- Loading skeleton rows are `aria-hidden`; only the loading status text is announced.

### Surface C: Create board dialog

#### Purpose

Provide the minimum board-creation flow needed to unblock the protected board experience.

#### Entry conditions

- User activates `Create board` from the shell header or boards-home empty state.

#### Content hierarchy

1. Dialog title: `Create board`
2. Body text: `Give this board a short name. New boards start with To do, In progress, and Done.`
3. Board name field
4. Primary submit button
5. Secondary cancel button
6. Optional form-level error

#### Field definitions

| Field      | Label        | Placeholder       | Default | Validation                             |
| ---------- | ------------ | ----------------- | ------- | -------------------------------------- |
| Board name | `Board name` | `Sprint planning` | empty   | required after trim, max 80 characters |

#### Controls

| Control | Label          | Enabled state                      |
| ------- | -------------- | ---------------------------------- |
| Submit  | `Create board` | Enabled when no request is pending |
| Cancel  | `Cancel`       | Enabled when no request is pending |

#### Exact copy

- Dialog title: `Create board`
- Body text: `Give this board a short name. New boards start with To do, In progress, and Done.`
- Submit pending label: `Creating board...`

#### Validation copy

- Empty after trim: `Enter a board name.`
- Too long: `Board name must be 80 characters or fewer.`

#### Error copy

- Generic create failure: `We couldn't create the board. Try again.`
- Network failure: `We couldn't reach the server. Check your connection and try again.`

#### Success behavior

- Live-region announcement: `Board created. Opening board.`
- On success the dialog closes and the app routes to the new board.

#### Keyboard behavior

- `Escape` closes the dialog when no request is pending.
- `Enter` submits from the input field.
- `Tab` order: board name, submit, cancel

#### Focus behavior

- Initial focus lands on the `Board name` field.
- On validation failure, focus moves to the invalid field.
- On form-level failure without field errors, focus moves to the form-level error container.
- On cancel, focus returns to the invoking `Create board` button.
- On success, focus lands on the new board's heading after navigation completes.

#### Mobile behavior

- On narrow screens, the dialog becomes a full-width sheet or full-screen modal.
- The field and action buttons use full available width.

#### Accessibility notes

- Implement with `PrettyModalWrap`.
- The dialog traps focus while open and restores focus on close.
- Error text is associated to the input with `aria-describedby`.

### Surface D: Board detail loading

#### Purpose

Show that a board route is loading while preserving orientation and the protected shell.

#### Entry conditions

- `/boards/$boardId` is loading and no usable board data is available for that route yet.

#### Content hierarchy

1. Back link: `Back to boards`
2. Status text: `Loading board...`
3. Board title skeleton
4. Board summary skeleton
5. Column skeleton region with 3 placeholder columns and 4 placeholder cards per column

#### Controls

| Control | Label            | Behavior            |
| ------- | ---------------- | ------------------- |
| Link    | `Back to boards` | Routes to `/boards` |

#### Interaction rules

- Only the main content area changes to the loading skeleton; the shell header stays visible.
- Skeleton counts do not try to match the actual board data size.

#### Loading / empty / error / success behavior

- Visible status text: `Loading board...`
- Live-region announcement: `Loading board.`
- This surface has no empty or success state of its own; it transitions into loaded, error, or not-available states.

#### Keyboard behavior

- `Back to boards` remains keyboard reachable while loading.

#### Focus behavior

- Direct entry focus lands on the visible `Loading board...` status text.

#### Mobile behavior

- The same hierarchy is used, but placeholder columns stack vertically instead of sitting side by side.

#### Accessibility notes

- Skeleton shapes are `aria-hidden`.
- Only the loading status text is announced.
- Reduced-motion users should see static placeholders instead of animated shimmer.

### Surface E: Loaded board detail

#### Purpose

Render the read-only board structure that later card, column, reorder, and detail slices can build on.

#### Entry conditions

- Board-detail read succeeds for `/boards/$boardId`.

#### Content hierarchy

1. Back link: `Back to boards`
2. Board title
3. Board summary text in the format `<columnCount> columns · <cardCount> cards`
4. Optional board-level helper when total visible card count is `0`
5. Optional inline refresh status or refresh error
6. Board canvas containing column sections

#### Column content hierarchy

1. Column title
2. Card count text
3. Either:
   - card tiles, or
   - empty-column text

#### Exact copy

- Back link: `Back to boards`
- Board-level zero-card helper: `Cards will appear here once they are added.`
- Empty-column text: `No cards yet.`
- Refresh status: `Refreshing board...`
- Refresh error: `We couldn't refresh the board. Showing the last loaded view.`
- Refresh error retry action: `Retry`

#### Card tile rules

- Card tile content includes:
  - card title
  - optional description preview when a description exists
- Card tiles are not interactive in this slice.
- Description preview is truncated according to the data-scale limits above.

#### Interaction rules

- Background refresh preserves the currently visible board content.
- Refresh error does not replace the board with a full-page error state.
- Columns are rendered in their stored order.
- Cards are rendered in their stored order within each column.

#### Loading / empty / error / success behavior

- Success:
  - loaded board content is visible
- Empty board:
  - if total card count is `0`, show the board-level helper plus `No cards yet.` in each empty column
- Background refresh:
  - keep content visible
  - show `Refreshing board...`
  - announce `Refreshing board.`
- Refresh failure:
  - keep content visible
  - show inline refresh error with `Retry`
  - announce `Board refresh failed.`

#### Keyboard behavior

- `Back to boards` is first in the page-content tab order.
- After page-level controls, each column section is focusable as one region in visual order.
- When a column section receives focus, the viewport scrolls as needed to bring that column fully into view.

#### Focus behavior

- Direct route entry after load focuses the board title.
- After successful create-board navigation, focus also lands on the board title.
- Retrying from the inline refresh error keeps focus on the retry control until success or failure feedback renders.

#### Mobile behavior

- Columns stack vertically in one main column.
- The board-level helper appears above the first column.

#### Accessibility notes

- Each focusable column section exposes an accessible name that includes the column title and card count.
- Do not rely on color alone to distinguish empty columns from populated columns.

### Surface F: Board detail load error

#### Purpose

Give the user a clear recovery path when a board route fails for a transient reason before usable data is available.

#### Entry conditions

- `/boards/$boardId` initial read fails due to a retryable network or server failure.

#### Content hierarchy

1. Heading: `We couldn't load this board`
2. Body: `Try again to reload this board.`
3. Primary action: `Retry`
4. Secondary action: `Back to boards`

#### Controls

| Control | Label            | Behavior                      |
| ------- | ---------------- | ----------------------------- |
| Button  | `Retry`          | Re-runs the board-detail read |
| Link    | `Back to boards` | Routes to `/boards`           |

#### Exact copy

- Heading: `We couldn't load this board`
- Body: `Try again to reload this board.`
- Retry pending label: `Retrying...`

#### Success behavior

- Successful retry transitions to the board-detail loading state and then the loaded board state.

#### Keyboard behavior

- `Tab` order: retry, back to boards

#### Focus behavior

- Focus lands on the error heading when the state first appears.

#### Mobile behavior

- Actions stack vertically.

#### Accessibility notes

- The error heading is announced as route-level content.

### Surface G: Board not available

#### Purpose

Handle board ids that are invalid for the current user without exposing ownership details.

#### Entry conditions

- `/boards/$boardId` read resolves to not found, soft-deleted, or inaccessible for the current user.

#### Content hierarchy

1. Heading: `This board isn't available`
2. Body: `It may have been deleted or you may not have access to it anymore.`
3. Primary action: `Back to boards`
4. Secondary action: `Create board`

#### Controls

| Control | Label            | Behavior                      |
| ------- | ---------------- | ----------------------------- |
| Link    | `Back to boards` | Routes to `/boards`           |
| Button  | `Create board`   | Opens the create-board dialog |

#### Keyboard behavior

- `Tab` order: back to boards, create board

#### Focus behavior

- Focus lands on the heading when the state appears.

#### Mobile behavior

- Actions stack vertically.

#### Accessibility notes

- This state must not reveal whether the board existed for another user.

## 11. Cross-Screen Interaction Rules

### Route protection and verification

- This slice inherits route protection from the auth/session spec.
- Verification reminder behavior is unchanged from the auth/session spec; only placement is resolved here.
- When the reminder applies, it renders below the protected shell header on both `/boards` and `/boards/$boardId`.

### Route transition behavior

- The protected shell header remains mounted through route changes within `/boards*`.
- Initial board-detail entry uses the dedicated loading skeleton.
- Background refresh of an already loaded board keeps content visible instead of returning to the full loading skeleton.

### Board list ordering

- `/boards` always orders boards by most recently updated first.
- This slice does not add pinning, sorting controls, or recents sections.

### Board creation

- Board creation is available from any protected board route through the shell header.
- Successful board creation creates the fixed default columns and routes immediately to the new board.
- Board creation is not undoable in this slice.

### Sign-out placement

- `Sign out` is a persistent shell-header action for this slice.
- Later profile or account-menu slices may change the visual treatment, but not the user-visible outcome defined by the auth/session spec.

### Refresh behavior

- Initial read failure with no prior board data uses the full board-load error state.
- Refetch failure after a loaded board exists uses the inline refresh-error state while preserving stale content.

### Tone rules

- Use sentence case throughout.
- Error copy should be direct and recoverable, not blameful.
- Loading copy should describe what is happening without over-explaining implementation details.

## 12. Undo and Redo Rules

- No user-initiated mutation in this slice is undoable.
- Create board does not expose undo in this slice.

## 13. Microcopy, Tone, and Announcement Strings

| Usage                              | Key-like label               | Exact string                                                                        |
| ---------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| Shell primary nav                  | `boards.nav`                 | `Boards`                                                                            |
| Shell create action                | `boards.create.trigger`      | `Create board`                                                                      |
| Boards home heading                | `boards.home.heading`        | `Boards`                                                                            |
| Boards home supporting text        | `boards.home.body`           | `Open a board or create a new one.`                                                 |
| Boards home loading                | `boards.home.loading`        | `Loading boards...`                                                                 |
| Boards home empty heading          | `boards.home.empty.heading`  | `No boards yet`                                                                     |
| Boards home empty body             | `boards.home.empty.body`     | `Create your first board to start organizing work.`                                 |
| Boards home error heading          | `boards.home.error.heading`  | `We couldn't load your boards`                                                      |
| Boards home error body             | `boards.home.error.body`     | `Try again to reload your boards.`                                                  |
| Create dialog title                | `board.create.heading`       | `Create board`                                                                      |
| Create dialog body                 | `board.create.body`          | `Give this board a short name. New boards start with To do, In progress, and Done.` |
| Create dialog submit pending       | `board.create.pending`       | `Creating board...`                                                                 |
| Create dialog success announcement | `board.create.success`       | `Board created. Opening board.`                                                     |
| Board loading status               | `board.loading.status`       | `Loading board...`                                                                  |
| Back-to-boards control             | `board.back`                 | `Back to boards`                                                                    |
| Board zero-card helper             | `board.emptyBoard.body`      | `Cards will appear here once they are added.`                                       |
| Empty-column body                  | `board.emptyColumn.body`     | `No cards yet.`                                                                     |
| Refresh status                     | `board.refresh.status`       | `Refreshing board...`                                                               |
| Refresh error                      | `board.refresh.error`        | `We couldn't refresh the board. Showing the last loaded view.`                      |
| Board load error heading           | `board.error.heading`        | `We couldn't load this board`                                                       |
| Board load error body              | `board.error.body`           | `Try again to reload this board.`                                                   |
| Board not-available heading        | `board.notAvailable.heading` | `This board isn't available`                                                        |
| Board not-available body           | `board.notAvailable.body`    | `It may have been deleted or you may not have access to it anymore.`                |

## 14. Data Visible to the User

- Boards home shows:
  - board name
  - column count
  - card count
- Loaded board detail shows:
  - board name
  - board-level total column count
  - board-level total card count
  - column titles
  - per-column card counts
  - card titles
  - optional card description previews
- Protected board routes may also show:
  - verification reminder banner content inherited from the auth/session spec
  - sign-out control

## 15. Validation and Error Handling

### Client-side validation rules

- Board name is trimmed before validation and submission.
- Empty after trim is invalid.
- More than 80 characters is invalid.
- Duplicate board names are allowed in this slice.

### Backend-dependent errors that must map cleanly

- unauthenticated or expired session
  - delegated to the auth/session slice behavior
- authenticated but verification-blocked
  - delegated to the auth/session slice behavior
- boards-home read failure
  - map to the boards-home error state
- board-detail read failure
  - map to the board-detail load error state
- board not found or inaccessible
  - map to the board-not-available state without leaking ownership details
- board create failure
  - map to the dialog error state with preserved field value

### Failure-state behavior

- Boards-home errors do not remove the protected shell header.
- Board-detail retryable errors do not leak raw backend error details into user-visible copy.
- Board-not-available copy must be the same for not-found, soft-deleted, and ownership-denied cases.
- Background refresh failure preserves stale content and uses inline retry-capable feedback instead of replacing the view.

## 16. Accessibility Requirements

- The protected board experience uses semantic header, nav, main, and dialog semantics.
- Every interactive control is reachable by keyboard alone.
- The create-board dialog traps focus, closes on `Escape`, and restores focus to the invoking `Create board` button.
- Every form field has a visible label.
- Loading, refresh, and create-board outcomes that matter are announced through one polite live region.
- The verification reminder banner remains non-modal.
- Focusable column regions allow keyboard users to reach off-screen columns on wide boards.
- Color is never the sole signal for loading, error, or empty states.

## 17. Responsive Behavior

- The protected shell header wraps rather than introducing horizontal scrolling.
- The boards-home route remains one vertical list on mobile and desktop.
- On viewports narrower than 1024 px, board-detail columns stack vertically.
- On viewports 1024 px and wider, board-detail columns render side by side in a horizontally scrollable board canvas.
- The create-board dialog becomes full-width or full-screen on narrow screens.
- Error and empty-state actions stack vertically on narrow screens.

## 18. Open Questions

1. Should `/boards` eventually gain search, sorting controls, or a recent-boards section beyond the current updated-descending list?
2. Should new boards always start with the fixed `To do / In progress / Done` template, or should later slices introduce selectable templates?
3. When the future card-detail slice arrives, should card activation open a modal or a side panel?
4. Should future board-level settings live in the shell header or on a separate board-settings route?

## 19. Acceptance Criteria

- An authenticated verified user can reach `/boards` and understand whether boards are loading, available, absent, or failed to load.
- A user with no boards can create one from the empty state without leaving the protected shell.
- Board creation uses a labeled, keyboard-operable dialog with validation and error handling.
- Successful board creation routes to the new board and shows the standard board-loading transition.
- A user can open a board from `/boards` and see a read-only loaded board with columns and card summaries.
- A board with zero cards still renders usable empty-column states.
- Initial board-route failures show a retryable error state instead of a blank page.
- Not-found or inaccessible boards show one neutral not-available state without leaking ownership details.
- Background refresh does not blank already loaded content.
- The verification reminder banner and sign-out control appear in stable, defined shell locations.

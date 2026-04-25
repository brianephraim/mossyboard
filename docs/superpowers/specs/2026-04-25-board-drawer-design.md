# Board Drawer — Design Spec

**Date:** 2026-04-25
**Status:** Design approved by user; implementation plan to follow.

## Summary

Add a second visible board to the board page. The sidebar gains an "Open in drawer" button next to "Open" on every row. Clicking it opens that board in a resizable bottom drawer that overlays the URL board. Both boards share view, groupBy, and priority filter (controlled solely by the main board's header). Cards can be dragged between the two boards.

## Goals

- A user can compare and shuffle work across two boards without losing the URL board.
- View / groupBy / priority filter act on both boards from a single set of controls.
- Cards drag between boards in board view; cross-board moves go through the existing `card.move` server mutation.
- The feature degrades gracefully on narrow viewports (entry points hidden; existing `?drawer=` params are ignored).

## Non-goals

- Three or more simultaneous boards.
- Independent filters per board (the drawer follows the main board).
- Cross-board column reorder.
- List-view drag-and-drop (list view has no DnD today; drawer renders list view too when main is in list view, with no DnD).
- Mobile/narrow-viewport drawer experience.

## User-visible decisions (locked)

| Decision                          | Choice                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drawer state location             | URL search param `?drawer=<boardId>`                                                                                                                                      |
| Filter / view / groupBy ownership | Main board header is sole editor; drawer follows (no controls in drawer)                                                                                                  |
| Cross-board card drop             | Drop onto a specific column in the drawer board; card's existing priority preserved unless the target droppable carries one                                               |
| Drawer interaction                | Resizable via top drag handle; height persisted globally in localStorage; default 60vh; bounds 25vh – 90vh                                                                |
| Underlying-board reachability     | Each scroll surface in the main board gets `paddingBottom = drawerHeight + 24` so all cards remain reachable                                                              |
| Sidebar row                       | Non-interactive container with two explicit buttons ("Open", "Open in drawer"); current-board indicator becomes left accent bar + soft tint; existing "Open" pill removed |
| Card detail                       | Single `?card=<id>` param; surface resolves which board owns the card                                                                                                     |
| Self-overlay                      | "Open in drawer" disabled when target board is the current main; `?drawer=<sameId>` is silently stripped                                                                  |
| Drawer chrome                     | Board name (clickable to promote), explicit "Promote to main" button, close (X), drag handle                                                                              |
| Promote-to-main                   | Drawer board becomes URL board; drawer closes; previous URL board no longer visible                                                                                       |
| List vs board view                | Drawer mirrors main's view; cross-board DnD only works in board view                                                                                                      |
| Mobile                            | Hide "Open in drawer" buttons below `md`; ignore `?drawer=` URL on narrow viewports                                                                                       |

## Architecture & file layout

A new orchestrator screen owns URL state, wraps a single DnD context that spans both boards, and renders two reusable board panes.

```
src/features/boards/
  BoardWorkspaceScreen.tsx     NEW. Orchestrates URL, both boards, single DragDropContext, modals.
  BoardPane.tsx                NEW. Reusable per-board content (header bits, BoardCanvas|list, loading/error). Takes boardId, search, role: "main" | "drawer".
  BoardDrawer.tsx              NEW. Resizable bottom-overlay shell. Owns chrome (title, promote, close, resize handle).
  BoardDetailScreen.tsx        DELETED — its responsibilities split into BoardWorkspaceScreen + BoardPane.
  BoardShell.tsx               UPDATED — sidebar row redesign, accept onOpenInDrawer.
  EditableBoardTitle.tsx       (existing, unchanged)
  BoardCanvas.tsx, ui.tsx, model.ts, priorityGrouping.ts, types.ts  (existing, mostly unchanged)
  useBoardMutations.ts         NEW. Extracts createCard/createColumn/renameBoard/deleteBoard/etc. from current screen so BoardWorkspaceScreen can reuse for both boards. Returns a mutations bundle keyed by boardId.
  useDualBoardDnd.ts           NEW. Drag-end handler that resolves source/destination across both loaded boards and dispatches in-board reorder vs cross-board move.

src/routes/boards/$boardId.tsx  UPDATED — renders BoardWorkspaceScreen instead of BoardDetailScreen; search schema gains `drawer?: string` (boardId).

src/server/trpc/routers/card.ts  UPDATED — `card.move` allowed across boards (target column may belong to a different board owned by the same user).
```

**Soft-cap discipline:** `BoardWorkspaceScreen` orchestrates and stays under ~300 LOC by delegating mutations to `useBoardMutations` and DnD to `useDualBoardDnd`. `BoardPane` stays under ~250 LOC. The current `BoardDetailScreen.tsx` is ~1100 LOC and exceeds the project's 500 LOC review threshold; this extraction is healthy regardless of the drawer feature.

## URL schema

`/boards/$boardId` search params:

| Param      | Type                                            | Notes                                                                                                                   |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `view`     | `"board" \| "list"`                             | Existing. Applies to **both** boards.                                                                                   |
| `groupBy`  | `"column" \| "priority"`                        | Existing. Applies to both.                                                                                              |
| `priority` | comma-list of `"none"\|"low"\|"medium"\|"high"` | Existing. Applies to both.                                                                                              |
| `card`     | `string` (cardId)                               | Existing. Single open card detail; resolves to whichever board owns the id.                                             |
| `drawer`   | `string` (boardId) — **NEW**                    | Board to render in the bottom drawer. Ignored on narrow viewports. Ignored if equal to `$boardId` (self-overlay guard). |

`?card=<id>` look-up rule: check the main board first, then the drawer board. If neither has it, the detail surface fetches the card by id and uses the card record's `boardId` for any mutations triggered from the surface.

## BoardPane component

`BoardPane` is the reusable per-board renderer used in both the main slot and the drawer slot.

```ts
type BoardPaneProps = {
  boardId: string;
  search: BoardDetailSearch; // shared from URL; pane never edits it
  role: "main" | "drawer";
  // DnD: a single DragDropContext lives in BoardWorkspaceScreen.
  // BoardPane only renders Droppables; it does not own onDragEnd.
  // Each Droppable id is namespaced (see "Cross-board drag-and-drop" below).
  onOpenCard: (cardId: string) => void;
  onOpenCreateCard: (columnId: string) => void;
  onOpenCreateColumn: (afterColumnId: string | null) => void;
  // Mutations passed in (sourced from useBoardMutations(boardId)):
  mutations: BoardMutations;
  // Optimistic state owned per pane (each board has its own optimistic snapshot):
  optimisticBoard: LoadedBoard | null;
  setOptimisticBoard: (b: LoadedBoard | null) => void;
  conflictMessage: string | null;
  setConflictMessage: (m: string | null) => void;
  setAnnouncement: (m: string | null) => void;
  // Drawer-specific tail padding on each column scroll surface:
  bottomScrollPadding?: number; // px; only set on main pane when drawer is open
};
```

**Invariants**

- **Pane never reads or writes URL search.** It receives `search` as a prop. `role: "main"` and `"drawer"` differ only in: which mutations bundle is used, where `onOpenCard` posts (still single `card` param), and whether to render `BoardControls` (only when `role === "main"`).
- **Each pane has its own optimistic-board state.** A drag in board A only affects A's optimistic snapshot; B is untouched, even though both panes render under one `DragDropContext`.
- **`bottomScrollPadding`** is applied to each column's scrollable card list (and the priority-group containers in `groupBy=priority`, and the flat list scroll container in list view) so the drawer overlay never permanently hides cards.

## Cross-board drag-and-drop

A single `<DragDropContext>` wraps both panes inside `BoardWorkspaceScreen`. Droppable and draggable ids are namespaced by board so `onDragEnd` can route correctly.

**ID namespacing**

```
droppableId = `${boardKey}::${existingId}`     where boardKey ∈ {"main","drawer"}
draggableId = `${boardKey}::${cardOrColumnId}`
```

`existingId` keeps current shapes: `"board-columns"`, `"<columnId>"`, or the priority-group encoding from `priorityGrouping.ts`. A small `parseScopedId(id)` helper splits the prefix.

**`useDualBoardDnd` flow** (in `BoardWorkspaceScreen`)

```
onDragEnd(result):
  src = parseScopedId(result.source.droppableId)
  dst = parseScopedId(result.destination?.droppableId)
  if no dst: return
  if result.type === "COLUMN":
    if src.boardKey !== dst.boardKey: return    // cross-board column moves disallowed
    delegate to that pane's existing column-reorder logic
    return
  // CARD
  if src.boardKey === dst.boardKey:
    delegate to that pane's existing card-reorder logic (in-board reorder or move-between-columns)
    return
  // Cross-board card move:
  cross-board-move(src.boardKey → dst.boardKey, draggableId, result.destination)
```

**Cross-board card move semantics**

- Drop target must be a column-scoped droppable (not the top-level columns rail). If it is a priority-group droppable, the card lands at that priority and position.
- Card's existing `priority` is preserved unless dropped into a priority-group droppable (which carries its own priority).
- Optimistic update: remove card from source board's snapshot, insert into destination board's snapshot at computed neighbor position. Each board has independent optimistic state.
- Server call: `card.move({ cardId, targetColumnId, priority?, prevCardId, nextCardId, expectedVersion })`. Same shape as today; the procedure is loosened to accept a target column on a different board owned by `ctx.userId`.
- On success: invalidate both `card.listByBoard` queries (one per boardId) and refetch both `board.getWithColumnsAndCards` queries.
- On conflict (version mismatch or target-column-deleted): clear both optimistic snapshots, show conflict notice on the **source** board's pane (or destination pane for target-column-deleted), refetch both.

**Server-side change** (`src/server/trpc/routers/card.ts`)

The `card.move` procedure currently scopes source and target columns to the same board. Loosen that constraint while keeping all other guards:

- Source card resolves to its current `boardId`; target column resolves to its `boardId`.
- Both must be owned by `ctx.userId` and `deleted_at IS NULL`.
- Transaction `SELECT ... FOR UPDATE` on the moved card; bump `card.version`. Bump affected columns' versions on both boards (per existing pattern).
- Fractional key inserted via `keyBetween(prev, next)` against the destination column's existing cards.
- Errors: `TRPCError("CONFLICT")` on version mismatch; `TRPCError("NOT_FOUND")` on missing/deleted target column.

**Disallowed during drag**

- Cross-board column drags (return early).
- Cross-board drags in `list` view (impossible — list mode has no DnD today).

## BoardDrawer component

```ts
type BoardDrawerProps = {
  boardId: string; // the drawer board
  boardName: string | null; // for the title (null while loading)
  onClose: () => void; // clears ?drawer= from URL
  onPromote: () => void; // navigates to /boards/<drawerId>, clears ?drawer=
  onHeightChange: (px: number) => void; // bubbles up to BoardWorkspaceScreen for bottom-padding calc
  children: ReactNode; // <BoardPane role="drawer" .../>
};
```

**Layout**

- Position: `fixed` to viewport bottom, full width, above main content (z-index above `BoardPageChrome`, below modals/`PrettyModalWrap`).
- Height: stateful, default `60vh`. Bounds: `min(240px, 25vh)` to `90vh`. Persisted in `localStorage` under key `boardDrawerHeightPx` (single global preference).
- Chrome bar at top of drawer: drag handle (visual grip + `cursor: ns-resize`), board name (button — clicking promotes via `onPromote`), "Promote to main" explicit button, close (X) button. Height ~44px.
- Body: scroll-clipped; the inner `BoardPane` handles its own column scrolling.

**Resize**

- Pointer-driven via `onPointerDown` on the handle → `pointermove` listener attached to `window` until `pointerup`.
- Computes `nextHeight = clamp(window.innerHeight - clientY, minHeight, 0.9 * innerHeight)`.
- During drag: also calls `onHeightChange(nextHeight)` so main pane's bottom padding tracks live (not just on release).
- On release: persists final height to localStorage.
- Keyboard: drag handle is focusable; `ArrowUp`/`ArrowDown` adjust height in 32px steps; `Home` = min, `End` = max. Satisfies project keyboard-alternative rule.

**Bottom padding propagation**

`BoardWorkspaceScreen` keeps `drawerHeight` in state (initialized from localStorage when drawer opens, updated by `onHeightChange`). Passes `bottomScrollPadding={drawerHeight + 24}` to the main `BoardPane`. The main pane forwards it to:

- Each column's card-list scroll container (board view, `groupBy=column`)
- Each priority-group scroll container (board view, `groupBy=priority`)
- The flat list scroll container (list view)

Effectively each scroll surface gets `paddingBottom: drawerHeight + 24px` so all cards remain reachable by scrolling within the surface.

**Accessibility**

- Drawer is _not_ a modal — no focus trap, body remains interactive (cross-board DnD requires it).
- Close on `Esc` only when drawer chrome (or a child of it) has focus, not globally — prevents accidental closure while typing in a card on the main board.
- `aria-label` on the drawer region: `"Drawer: {boardName}"`. Drag handle: `aria-label="Resize drawer"`, `role="separator"`, `aria-orientation="horizontal"`, `aria-valuenow/min/max` reflecting height.

## Sidebar row redesign

`BoardRailBoardRow` (currently in `BoardShell.tsx`) becomes a non-interactive container with two explicit buttons. Whole-row click is removed.

```
┌─────────────────────────────────────────────┐
│▎ Board name                                 │
│  4 columns • 12 cards                       │
│  [Open]  [Open in drawer]                   │
└─────────────────────────────────────────────┘
```

- "Open" — navigates to `/boards/<id>` using existing `useLinkProps` (preserves search defaults).
- "Open in drawer" — calls `onOpenInDrawer(id)` passed from `BoardShell` consumer; `BoardWorkspaceScreen` writes `?drawer=<id>` into URL search. Disabled when `id === currentBoardId` and hidden entirely below `md` per `useMedia()`.
- Current-board indicator: left accent bar (4px wide, `$boardAccent`) + soft background tint. The "Open" pill is removed.
- Both buttons are real `<BoardActionButton>` (Tamagui), keyboard-reachable via Tab order, no whole-row click.

**`BoardShell` prop change**

```ts
type BoardShellProps = {
  // ...existing...
  onOpenInDrawer?: (boardId: string) => void; // NEW; absent on screens that don't host a drawer
};
```

When prop is absent (e.g. boards index screen), the "Open in drawer" button is hidden.

## BoardWorkspaceScreen orchestration

```ts
function BoardWorkspaceScreen({ boardId, rawSearch }) {
  const search = parseBoardDetailSearch(rawSearch);  // gains `drawer`
  const drawerBoardId = resolveDrawerId(search.drawer, boardId, useMedia().maxMd);
  // ↑ returns null if equal to boardId, or if narrow viewport, or unset

  const mainBoardQuery   = trpc.board.getWithColumnsAndCards.useQuery({ boardId });
  const drawerBoardQuery = trpc.board.getWithColumnsAndCards.useQuery(
    { boardId: drawerBoardId! },
    { enabled: drawerBoardId !== null }
  );

  // Optimistic + conflict state per pane (independent):
  const main   = useBoardPaneState();
  const drawer = useBoardPaneState();

  // Mutations bundled per board:
  const mainMutations   = useBoardMutations(boardId, main);
  const drawerMutations = useBoardMutations(drawerBoardId, drawer);

  const onDragEnd = useDualBoardDnd({
    main:   { boardId, board: main.optimisticBoard ?? mainBoardQuery.data?.board, state: main, mutations: mainMutations },
    drawer: { boardId: drawerBoardId, board: drawer.optimisticBoard ?? drawerBoardQuery.data?.board, state: drawer, mutations: drawerMutations },
  });

  return (
    <>
      <BoardShell currentBoardId={boardId} onOpenInDrawer={(id) => updateSearch({ drawer: id })} ...>
        <DragDropContext onDragEnd={onDragEnd}>
          <BoardPane role="main" boardId={boardId} search={search}
                     bottomScrollPadding={drawerHeight} ... />
          {drawerBoardId !== null && (
            <BoardDrawer boardId={drawerBoardId}
                         boardName={drawerBoardQuery.data?.board?.name ?? null}
                         onClose={() => updateSearch({ drawer: undefined })}
                         onPromote={() => navigate({
                           to: "/boards/$boardId",
                           params: { boardId: drawerBoardId },
                           search: { ...search, drawer: undefined },
                         })}
                         onHeightChange={setDrawerHeight}>
              <BoardPane role="drawer" boardId={drawerBoardId} search={search} ... />
            </BoardDrawer>
          )}
        </DragDropContext>
      </BoardShell>

      <CardDetailSurface .../>     {/* Single instance, resolves card across both boards */}
      {/* Modals: createCard / createColumn / boardSettings — keyed to whichever board triggered them */}
    </>
  );
}
```

**Modal keying**

Create-card / create-column / board-settings modals each carry a `targetBoardId` so the right mutation bundle fires when submitted. `boardSettings` is only triggered from the main board's header (the drawer chrome does not expose settings).

**Card detail resolution**

`CardDetailSurface` accepts a list of candidate boardIds (`[boardId, drawerBoardId].filter(Boolean)`). It resolves which board owns `?card=<id>` by checking each loaded snapshot. The trpc query for the card itself is unchanged.

## State lifecycle & edge cases

**Drawer URL changes**

- `?drawer=<id>` added → drawer mounts; query fires for that board; height initialized from localStorage.
- `?drawer=` removed → drawer unmounts; `drawerBoardQuery` disabled; in-flight optimistic state for the drawer pane is discarded.
- `?drawer=<id>` changes id (rare — only via direct URL edit) → drawer pane remounts on the new id; old optimistic state cleared via the same `useEffect(() => setOptimisticBoard(null), [boardId])` pattern that exists today.
- Self-overlay (`drawer === boardId`): treated as not set; `drawer` param is silently stripped on mount via a normalization effect.
- Narrow viewport: `drawer` param is ignored (drawer not rendered). Param remains in URL so widening the viewport restores the drawer without losing state.

**Drawer board fails to load**

- 404 / NOT_FOUND (deleted, not owned): drawer renders an inline notice with a Close button. No retry — the param should be removed. Auto-clears `?drawer=` after 3 seconds with a polite live-region announcement ("Drawer board no longer available; closing.").
- Generic error: drawer renders the existing `BoardStateCard` "We couldn't load this board" with Retry, mirroring main pane's pattern.
- Loading: drawer chrome renders with `boardName="Loading…"`; body shows existing loading state card.

**Cross-board move conflicts**

- Version mismatch on source card → both panes' optimistic state cleared; conflict notice on **source pane** only ("We couldn't move that card because the board changed. Refresh and try again."); both queries refetched.
- Target column missing/deleted → conflict notice on **destination pane** ("Target column no longer exists.") with the same refresh affordance.

**Card detail across boards**

- `?card=<id>` resolution: check main pane's loaded board first, fall back to drawer's. If neither has it but trpc query for the card succeeds, `boardId` from the card record drives which board's mutations are used by the detail surface.
- If the card's board is _neither_ main nor drawer (stale URL after a drawer close), the detail surface still works in read/edit mode; cross-board reorder mutations within the surface use the card's actual `boardId`.
- Closing the card detail: clears `?card=`. Independent of `?drawer=`.

**Promote-to-main**

- Navigates to `/boards/<drawerBoardId>` with `?drawer=undefined` and the existing `view`/`groupBy`/`priority`/`card` carried over. The previous main board is no longer visible.

**Mutations and refetch keys**

- Main mutations invalidate `card.listByBoard({ boardId: main })` and refetch main's `getWithColumnsAndCards`.
- Drawer mutations invalidate the drawer board's keys.
- Cross-board moves invalidate **both** card.listByBoard keys and refetch **both** board queries.
- `board.list` is invalidated on board-level mutations (rename/delete) — same as today.

**Accessibility & live regions**

- Existing `BoardLiveRegion` stays as a single page-level region (not duplicated for drawer). Announcements include the board name when the action targets the drawer board ("Card moved in {drawerBoardName}.").

## Tests (scope)

Detailed test items belong in the implementation plan. Scope reference:

- **Unit:** `parseScopedId`, drawer-id normalization (self-overlay strip, narrow-viewport gate), `useDualBoardDnd` routing.
- **Component:** `BoardDrawer` resize (pointer + keyboard), `BoardRailBoardRow` two-button layout, current-board indicator, "Open in drawer" disabled on current board.
- **Server:** `card.move` accepts cross-board target column owned by same user; rejects target on another user's board with NOT_FOUND; rejects soft-deleted target column.
- **E2E:** open drawer from rail; drag a card from main to drawer; verify both boards update; promote-to-main; close on Esc with focus in drawer chrome; narrow-viewport gate hides "Open in drawer".

## Open follow-ups (not in scope)

- Per-board-pair drawer height memory (currently global).
- Drawer-board settings (rename/delete) from drawer chrome.
- Mobile-friendly drawer experience.

## Edge-button (programmatic) card moves: animation quandary

### What’s the glitch?

When moving cards using the on-card edge buttons (up/down/left/right), the **surrounding cards animate** (they slide out of the way), but the **moved card “teleports”**: it appears in its new slot immediately rather than riding the drag/drop animation.

This is most noticeable for left/right moves (cross-column), but it can also show up for within-column reorder.

### Why it’s different from the library example

The official programmatic dragging example we started from is:

- `https://dnd.hellopangea.com/?path=/story/examples-programmatic-dragging--with-controls`

That example uses hello-pangea in its “standard” model:

- **No virtualization**
- **No `Droppable mode="virtual"`**
- **No `renderClone`**
- Items exist as real DOM nodes the whole time, so the dragged `Draggable` itself becomes the `position: fixed` element and animates to its computed “home”.

Our board implementation is fundamentally different because we’re combining:

- **Virtualized card lists** via `react-virtuoso`
- **Hello-pangea virtual mode**: `Droppable mode="virtual"` + mandatory `renderClone`
- **Optimistic updates** driven by TanStack Query cache patching (`patchSliceCache`)

With `mode="virtual"`, the dragged element you see during drag/drop is not the original list item. Hello-pangea hides the real draggable and mounts a **clone portal** produced by our `renderClone` function. That clone’s ability to animate depends on:

- Stable dimensions (drag start + placeholder math)
- Stable card identity/content for the clone while the internal drag state transitions
- The app not reshaping the list in a way that invalidates hello-pangea’s cached positions at the wrong time

### What we changed to fix earlier flicker (and why it matters here)

We had an earlier, separate problem: on a normal mouse drag, the card would briefly flicker back to its original position on drop, then jump to the final position.

The underlying issue was **state propagation timing**:

- optimistic cache patch → TanStack Query notify → component tree re-render → hello-pangea drop animation

When notifications were scheduled asynchronously (via TanStack’s default notifier scheduler), the UI could lag behind the drop animation lifecycle, producing a “snap back” effect.

To address that, we made propagation more synchronous:

- `notifyManager.setScheduler((cb) => cb())` in `src/trpc/provider.tsx`
- `useLayoutEffect`-style propagation for slice hydration in `src/features/boards/columnCards/SliceHydrator.tsx`

Those changes improved the drop flicker, but they also increased the chances that **our optimistic patch lands “too early” relative to hello-pangea’s programmatic drag/drop timeline**.

### Hypotheses we tested (and current results)

#### 1) “The clone is rendering the wrong card after the patch”

In `renderClone`, we originally looked up the card by `rubric.source.index` (source index at drag start). If the list is synchronously re-ordered/modified by an optimistic patch, `rubric.source.index` can point at a different card (or `undefined`).

We attempted to make clone lookup stable by resolving the card by `rubric.draggableId` (unscoped) against a stable `id -> card` map:

- `src/features/boards/BoardCanvas/VirtualizedCardList.tsx`

Result: **This alone did not eliminate the teleport**.

#### 2) “Defer the optimistic patch by a frame so the drop animation can start”

We briefly tried deferring the optimistic patch in `useDualBoardDnd` by one animation frame (via `requestAnimationFrame`) so hello-pangea could dispatch its internal `DROP_ANIMATING` state first.

Result: **No change** in the teleport behavior.

### Working theory: why the moved card teleports while siblings animate

Even when the moved card clone is “correct”, the programmatic edge-button flow is very bursty:

- `tryGetLock()` → `snapLift()` → `moveX()` → `drop()`

We already add a small timeout before `drop()` so it doesn’t all happen in one paint frame.

However, because we’re in `mode="virtual"`:

- sibling displacement animations come from hello-pangea’s calculated impact (those can still animate)
- the moved card’s visual continuity depends on the **clone portal staying mounted and animating to its computed home**

If our virtual list re-renders in a way that changes what hello-pangea considers the “home” position, or if the underlying draggable mounts/unmounts at the wrong time, the clone can effectively “hand off” early and the user experiences a teleport.

In short: **the moved card’s animation is the most sensitive to identity/lifecycle timing; siblings can still animate because their transforms are driven by displacement calculations that tolerate some list churn.**

### What would make this match the library example again?

There isn’t a single small tweak that guarantees parity with the storybook because our architecture adds constraints the example doesn’t have.

Realistic options:

1. **Drop virtual mode for cards** (no `renderClone`, no `react-virtuoso` in columns)
   - Pros: simplest mental model; edge-button programmatic drags behave like the demo
   - Cons: loses virtualization perf wins; likely regresses large-board performance

2. **Keep virtualization but stop using hello-pangea programmatic sensor for edge buttons**
   - Edge buttons would directly invoke the same reorder/move mutations (and optimistic patches) without pretending it’s a “drag”.
   - Pros: predictable; no reliance on DnD animation lifecycle
   - Cons: you lose the “drag-like” animation of the moved card unless we build a dedicated animation (FLIP / layout animation / shared-element style), which is non-trivial.

3. **Keep virtualization + programmatic sensor, but restructure state updates**
   - Ensure the list shape doesn’t change until after hello-pangea is in `DROP_ANIMATING`, and ensure the clone can keep rendering stable content/dimensions for the duration.
   - Pros: best UX if achieved
   - Cons: complex and fragile; tends to involve deferring optimistic updates, buffering list snapshots, or maintaining separate “visual order” state during DnD.

### Current status

- The board has a solid drag experience in normal pointer drag with virtualization.
- The edge-button programmatic move still has a mismatch: **neighbors animate, moved card teleports**.
- We are intentionally pausing deeper surgery here until it’s worth choosing one of the above architectural directions.

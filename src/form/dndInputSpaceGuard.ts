/**
 * Stops `@hello-pangea/dnd`'s mouse + keyboard sensors from hijacking events
 * that the user clearly meant for a focused input/textarea/contenteditable.
 *
 * Why this is a module-level installer (not a React effect):
 *
 * - dnd's sensors register their window-level capture listeners via
 *   `useIsomorphicLayoutEffect` on `DragDropContext`. Whichever listener is
 *   added to `window` first wins capture-phase ordering for that target.
 * - A React-effect-based guard inside an input field cannot guarantee it
 *   beats dnd: layout effects run child-first, but only on initial mount.
 *   When a card mounts later (virtualized list scrolling, a newly created
 *   card, or HMR), its effect appends a new listener *after* dnd's already
 *   in the queue, so dnd fires first and `event.preventDefault()`s the
 *   space (eating it) before lifting the draggable (stealing focus).
 * - Module-level registration runs on first `import` — strictly before
 *   React mounts the tree and dnd's layout effect installs anything. A
 *   single window listener installed here is therefore guaranteed to
 *   precede any dnd sensor for the rest of the page's lifetime.
 *
 * Why scoped to dnd drag handles: we only call `stopImmediatePropagation()`
 * when the focused editable lives inside an element with the dnd-managed
 * `data-rfd-drag-handle-draggable-id` attribute. Outside dnd's tree there's
 * no other listener we need to silence, and stopping propagation
 * unconditionally on every input keystroke risks breaking unrelated
 * window-level keyboard handlers.
 */

const DRAG_HANDLE_SELECTOR = "[data-rfd-drag-handle-draggable-id]";
const INSTALLED_FLAG = "__kanbanDndInputSpaceGuardInstalled" as const;

type GuardWindow = Window & { [INSTALLED_FLAG]?: boolean };

function isEditableElement(node: Element | null): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") return true;
  if (node.isContentEditable) return true;
  return false;
}

function isInsideDragHandle(node: Element): boolean {
  return node.closest(DRAG_HANDLE_SELECTOR) !== null;
}

function isSpaceKey(event: KeyboardEvent): boolean {
  return event.key === " " || event.code === "Space" || event.keyCode === 32;
}

function onWindowCaptureKeyDown(event: KeyboardEvent): void {
  if (!isSpaceKey(event)) return;
  const active = document.activeElement;
  if (!isEditableElement(active)) return;
  if (!isInsideDragHandle(active)) return;
  event.stopImmediatePropagation();
}

function onWindowCaptureMouseDown(event: MouseEvent): void {
  const active = document.activeElement;
  if (!isEditableElement(active)) return;
  if (!isInsideDragHandle(active)) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  // Only shield mousedowns that happen *inside* the focused editable. A
  // mousedown outside it is the user clicking somewhere else (e.g. another
  // card to drag), and dnd should be allowed to handle it normally.
  if (!active.contains(target)) return;
  event.stopImmediatePropagation();
}

/**
 * Idempotent. Safe to call from multiple modules; only installs once per
 * window (survives HMR module reloads via the `INSTALLED_FLAG` on `window`).
 */
export function installDndInputSpaceGuard(): void {
  if (typeof window === "undefined") return;
  const w = window as GuardWindow;
  if (w[INSTALLED_FLAG]) return;
  w[INSTALLED_FLAG] = true;
  window.addEventListener("keydown", onWindowCaptureKeyDown, { capture: true });
  window.addEventListener("mousedown", onWindowCaptureMouseDown, { capture: true });
}

installDndInputSpaceGuard();

import { useCallback, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

const DEFAULT_THRESHOLD_PX = 5;

type UseDragSafePressInput = {
  onActivate: () => void;
  thresholdPx?: number;
};

type UseDragSafePressReturn = {
  onMouseDown: (event: ReactMouseEvent) => void;
};

/**
 * Returns an `onMouseDown` handler that calls `onActivate()` only if the
 * pointer was released without moving more than `thresholdPx`. If the user
 * drags beyond the threshold before releasing, `onActivate` is suppressed —
 * letting an outer drag handle (e.g. hello-pangea/dnd) take over.
 */
export function useDragSafePress({
  onActivate,
  thresholdPx = DEFAULT_THRESHOLD_PX,
}: UseDragSafePressInput): UseDragSafePressReturn {
  const stateRef = useRef<{ moved: boolean } | null>(null);

  const onMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      if (typeof window === "undefined") {
        onActivate();
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const state = { moved: false };
      stateRef.current = state;

      const onMove = (windowEvent: MouseEvent) => {
        if (state.moved) return;
        const dx = windowEvent.clientX - startX;
        const dy = windowEvent.clientY - startY;
        if (Math.hypot(dx, dy) >= thresholdPx) {
          state.moved = true;
        }
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (!state.moved) {
          onActivate();
        }
        stateRef.current = null;
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onActivate, thresholdPx],
  );

  return { onMouseDown };
}

import { useEffect, useId, useRef } from "react";
import type { ComponentProps, MouseEvent as ReactMouseEvent } from "react";
import { Input } from "@tamagui/input";
import {
  useFormContext,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";

import { joinAriaIds } from "./FormFieldFrame";
import { readTamaguiTextInputValue } from "./tamaguiFieldAdapters";

// Flip to `true` to trace each step of the focus-on-mouseup gesture
// in the browser console (filter by `[ft-focus]`). Kept in source so we
// can re-enable quickly without restructuring the handlers.
const DEBUG_FOCUS_ON_MOUSE_UP = false;
let debugSeq = 0;
function nextDebugId() {
  debugSeq += 1;
  return debugSeq;
}
function debugFocus(message: string, data: Record<string, unknown> = {}) {
  if (!DEBUG_FOCUS_ON_MOUSE_UP) return;
  // eslint-disable-next-line no-console
  console.log(`[ft-focus] ${message}`, data);
}
function describeNode(node: Element | null | undefined): string {
  if (!node) return "<none>";
  const tag = node.tagName.toLowerCase();
  const aria = node.getAttribute("aria-label");
  const id = node.getAttribute("id");
  return `${tag}${id ? `#${id}` : ""}${aria ? `[aria-label="${aria}"]` : ""}`;
}

type FormInlineTextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Readonly<{
  additionalDescribedBy?: string;
  "aria-label": string;
  defaultValue?: FieldPathValue<TFieldValues, TName>;
  inputId?: string;
  name: TName;
  rules?: RegisterOptions<TFieldValues, TName>;
  inputRef?: (node: HTMLInputElement | null) => void;
  /**
   * When true, defer focusing the input from a mouse press until the
   * matching mouseup, and only if the pointer moved less than
   * `focusOnMouseUpDragThresholdPx`. Lets the input coexist with a
   * `@hello-pangea/dnd` drag handle that wraps it: a click focuses
   * the input, but a drag-out gesture instead moves the parent
   * draggable.
   *
   * The parent `Draggable` should set `disableInteractiveElementBlocking`,
   * otherwise dnd refuses to start a drag from the input region.
   */
  focusOnMouseUp?: boolean;
  /** Movement threshold (px) above which mouseup will not refocus. */
  focusOnMouseUpDragThresholdPx?: number;
}> &
  Omit<
    ComponentProps<typeof Input>,
    "aria-describedby" | "aria-invalid" | "id" | "name" | "ref" | "value"
  >;

const DEFAULT_DRAG_THRESHOLD_PX = 5;

export function FormInlineTextField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  additionalDescribedBy,
  defaultValue,
  inputId,
  inputRef,
  name,
  rules,
  focusOnMouseUp = false,
  focusOnMouseUpDragThresholdPx = DEFAULT_DRAG_THRESHOLD_PX,
  ...inputProps
}: FormInlineTextFieldProps<TFieldValues, TName>) {
  const generatedId = useId();
  const { register, setValue, getFieldState, formState } = useFormContext<TFieldValues>();
  const fieldState = getFieldState(name, formState);
  const resolvedInputId = inputId ?? `${generatedId}-field`;
  const describedBy = joinAriaIds(additionalDescribedBy);
  const {
    onBlur: onBlurProp,
    onChange: onChangeProp,
    onMouseDown: onMouseDownProp,
    ...restInputProps
  } = inputProps;
  const registration = register(name, rules);
  const localInputRef = useRef<HTMLInputElement | null>(null);

  // Prevent @hello-pangea/dnd's keyboard sensor from intercepting Space while
  // the input is focused (it uses Space to initiate keyboard dragging).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onWindowCaptureKeyDown = (event: globalThis.KeyboardEvent) => {
      const node = localInputRef.current;
      if (!node) return;
      if (document.activeElement !== node) return;
      if (event.key === " " || event.code === "Space" || event.keyCode === 32) {
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", onWindowCaptureKeyDown, true);
    return () => window.removeEventListener("keydown", onWindowCaptureKeyDown, true);
  }, []);

  // While the input is focused, prevent dnd from acquiring a drag lock on
  // mousedown so the browser's native cursor-positioning and drag-to-select
  // text behavior keeps working.
  //
  // dnd's mouse sensor listens at window-level capture phase. We attach our
  // own window-level capture listener here. Because React effects fire
  // child-first and `FormInlineTextField` lives inside `DragDropContext`,
  // our listener is registered before dnd's and runs first; calling
  // `stopImmediatePropagation` skips dnd's handler entirely. We do *not*
  // call `preventDefault` — that would also kill the browser's text-select
  // behavior we're trying to preserve.
  useEffect(() => {
    if (!focusOnMouseUp || typeof window === "undefined") {
      return;
    }
    const onWindowCaptureMouseDown = (event: globalThis.MouseEvent) => {
      const node = localInputRef.current;
      if (!node) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!node.contains(target)) return;
      if (document.activeElement !== node) return;
      event.stopImmediatePropagation();
      debugFocus("window-capture mousedown stopped (input focused)", {
        target: describeNode(target as Element),
      });
    };
    window.addEventListener("mousedown", onWindowCaptureMouseDown, true);
    return () => {
      window.removeEventListener("mousedown", onWindowCaptureMouseDown, true);
    };
  }, [focusOnMouseUp]);

  const handleMouseDown = (event: ReactMouseEvent<HTMLInputElement>) => {
    onMouseDownProp?.(event);
    const gestureId = nextDebugId();
    debugFocus("mouseDown received", {
      gestureId,
      focusOnMouseUp,
      defaultPrevented: event.defaultPrevented,
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY,
      hasInputRef: localInputRef.current !== null,
      activeElementBefore: describeNode(
        typeof document !== "undefined" ? (document.activeElement as Element | null) : null,
      ),
    });
    if (!focusOnMouseUp) {
      debugFocus("mouseDown skipped (focusOnMouseUp disabled)", {
        gestureId,
        focusOnMouseUp,
      });
      return;
    }
    // Note: we intentionally do NOT short-circuit on event.defaultPrevented.
    // @hello-pangea/dnd's window-level capture mousedown handler runs
    // before this element-level handler and calls preventDefault() once it
    // acquires a lock — that's exactly the scenario this code exists to
    // recover from, by manually focusing on the matching mouseup if the
    // pointer didn't move past the drag threshold.
    const node = localInputRef.current;
    const alreadyFocused =
      typeof document !== "undefined" && node !== null && document.activeElement === node;
    if (alreadyFocused) {
      // The window-capture mousedown effect already shielded us from dnd
      // for this gesture; nothing to do here. We must not register
      // mouseup-focus tracking — the input is already focused, and the
      // user is doing normal cursor positioning / drag-select.
      debugFocus("mouseDown while already focused; deferring to native", { gestureId });
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const startX = event.clientX;
    const startY = event.clientY;
    let movedBeyondThreshold = false;
    let moveCount = 0;
    const onWindowMove = (windowEvent: globalThis.MouseEvent) => {
      moveCount += 1;
      if (movedBeyondThreshold) return;
      const dx = windowEvent.clientX - startX;
      const dy = windowEvent.clientY - startY;
      const distance = Math.hypot(dx, dy);
      if (distance > focusOnMouseUpDragThresholdPx) {
        movedBeyondThreshold = true;
        debugFocus("mouseMove crossed drag threshold", {
          gestureId,
          distance,
          threshold: focusOnMouseUpDragThresholdPx,
          moveCount,
        });
      }
    };
    const onWindowUp = (windowEvent: globalThis.MouseEvent) => {
      window.removeEventListener("mousemove", onWindowMove);
      window.removeEventListener("mouseup", onWindowUp);
      const dx = windowEvent.clientX - startX;
      const dy = windowEvent.clientY - startY;
      debugFocus("mouseUp window-level handler fired", {
        gestureId,
        movedBeyondThreshold,
        moveCount,
        finalDistance: Math.hypot(dx, dy),
        threshold: focusOnMouseUpDragThresholdPx,
        hasInputRef: localInputRef.current !== null,
        activeElementBeforeFocus: describeNode(document.activeElement as Element | null),
      });
      if (movedBeyondThreshold) {
        debugFocus("mouseUp skip focus (was a drag)", { gestureId });
        return;
      }
      const target = localInputRef.current;
      if (!target) {
        debugFocus("mouseUp skip focus (no input ref)", { gestureId });
        return;
      }
      if (document.activeElement === target) {
        debugFocus("mouseUp skip focus (already active)", { gestureId });
        return;
      }
      try {
        target.focus();
      } catch (err) {
        debugFocus("mouseUp focus() threw", { gestureId, err: String(err) });
      }
      debugFocus("mouseUp called focus()", {
        gestureId,
        activeElementImmediate: describeNode(document.activeElement as Element | null),
        nowFocused: document.activeElement === target,
      });
      // Detect if focus is stolen back by something else right after.
      window.setTimeout(() => {
        debugFocus("mouseUp focus state after 50ms", {
          gestureId,
          activeElement: describeNode(document.activeElement as Element | null),
          stillFocused: document.activeElement === target,
        });
      }, 50);
    };
    window.addEventListener("mousemove", onWindowMove);
    window.addEventListener("mouseup", onWindowUp);
    debugFocus("mouseDown registered window mousemove + mouseup", {
      gestureId,
      startX,
      startY,
      threshold: focusOnMouseUpDragThresholdPx,
    });
  };

  return (
    <Input
      {...restInputProps}
      id={resolvedInputId}
      name={registration.name}
      ref={(node: HTMLInputElement | null) => {
        registration.ref(node);
        localInputRef.current = node;
        inputRef?.(node);
      }}
      defaultValue={defaultValue as string | undefined}
      onMouseDown={handleMouseDown}
      onFocus={() => {
        debugFocus("input received focus event", {
          activeElement: describeNode(document.activeElement as Element | null),
        });
      }}
      onBlur={(event) => {
        debugFocus("input received blur event", {
          activeElementAtBlur: describeNode(document.activeElement as Element | null),
        });
        // Tamagui's web/native event union doesn't line up cleanly with RHF's
        // expected FocusEvent type, but the shape is compatible at runtime.
        registration.onBlur(event as unknown as Parameters<typeof registration.onBlur>[0]);
        (onBlurProp as unknown as ((e: typeof event) => void) | undefined)?.(event);
      }}
      onChange={(event) => {
        const value = readTamaguiTextInputValue(
          event as unknown as Parameters<typeof readTamaguiTextInputValue>[0],
        );
        setValue(name, value as FieldPathValue<TFieldValues, TName>, {
          shouldDirty: true,
          shouldTouch: true,
        });
        (onChangeProp as unknown as ((e: typeof event) => void) | undefined)?.(event);
      }}
      aria-describedby={describedBy}
      aria-invalid={fieldState.invalid}
      disabled={restInputProps.disabled}
    />
  );
}

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { ComponentProps, MouseEvent as ReactMouseEvent } from "react";
import { TextArea } from "@tamagui/input";
import {
  useFormContext,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type RegisterOptions,
  useWatch,
} from "react-hook-form";

import { joinAriaIds } from "./FormFieldFrame";
import { readTamaguiTextInputValue } from "./tamaguiFieldAdapters";

type FormInlineAutoGrowTextAreaFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Readonly<{
  additionalDescribedBy?: string;
  "aria-label": string;
  defaultValue?: FieldPathValue<TFieldValues, TName>;
  inputId?: string;
  name: TName;
  rules?: RegisterOptions<TFieldValues, TName>;
  textAreaRef?: (node: HTMLTextAreaElement | null) => void;
  minHeightPx?: number;
  maxHeightPx?: number;
  focusOnMouseUp?: boolean;
  focusOnMouseUpDragThresholdPx?: number;
}> &
  Omit<
    ComponentProps<typeof TextArea>,
    "aria-describedby" | "aria-invalid" | "id" | "name" | "ref" | "value"
  >;

const DEFAULT_DRAG_THRESHOLD_PX = 5;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

function resizeTextArea(
  node: HTMLTextAreaElement,
  { minHeightPx, maxHeightPx }: { minHeightPx?: number; maxHeightPx?: number },
) {
  node.style.height = "auto";
  const min = minHeightPx ?? 0;
  const raw = node.scrollHeight;
  const desired = Math.max(raw, min);

  if (maxHeightPx !== undefined && desired > maxHeightPx) {
    node.style.height = `${maxHeightPx}px`;
    node.style.overflowY = "auto";
    return;
  }

  node.style.height = `${desired}px`;
  node.style.overflowY = "hidden";
}

export function FormInlineAutoGrowTextAreaField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  additionalDescribedBy,
  defaultValue,
  inputId,
  name,
  rules,
  textAreaRef,
  minHeightPx,
  maxHeightPx,
  focusOnMouseUp = false,
  focusOnMouseUpDragThresholdPx = DEFAULT_DRAG_THRESHOLD_PX,
  ...textAreaProps
}: FormInlineAutoGrowTextAreaFieldProps<TFieldValues, TName>) {
  const generatedId = useId();
  const { register, setValue, getFieldState, formState } = useFormContext<TFieldValues>();
  const fieldState = getFieldState(name, formState);
  const describedBy = joinAriaIds(additionalDescribedBy);
  const resolvedInputId = inputId ?? `${generatedId}-field`;

  const {
    onBlur: onBlurProp,
    onChange: onChangeProp,
    onMouseDown: onMouseDownProp,
    ...restTextAreaProps
  } = textAreaProps;

  const registration = register(name, rules);
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  const watchedValue = useWatch({ name }) as unknown as string | undefined;

  const runResize = () => {
    const node = localRef.current;
    if (!node) return;
    resizeTextArea(node, { minHeightPx, maxHeightPx });
  };

  // Resize on mount and when the value changes externally.
  useLayoutEffect(() => {
    runResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValue, minHeightPx, maxHeightPx]);

  // While focused, prevent dnd from acquiring a drag lock on capture-phase
  // mousedown so native textarea selection / cursor placement continues working.
  useEffect(() => {
    if (!focusOnMouseUp || typeof window === "undefined") return;
    const onWindowCaptureMouseDown = (event: globalThis.MouseEvent) => {
      const node = localRef.current;
      if (!node) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!node.contains(target)) return;
      if (document.activeElement !== node) return;
      event.stopImmediatePropagation();
    };
    window.addEventListener("mousedown", onWindowCaptureMouseDown, true);
    return () => window.removeEventListener("mousedown", onWindowCaptureMouseDown, true);
  }, [focusOnMouseUp]);

  const handleMouseDown = (event: ReactMouseEvent<HTMLTextAreaElement>) => {
    onMouseDownProp?.(event);
    if (!focusOnMouseUp) return;

    const node = localRef.current;
    const alreadyFocused =
      typeof document !== "undefined" && node !== null && document.activeElement === node;
    if (alreadyFocused) {
      return;
    }

    event.preventDefault();

    if (typeof window === "undefined") return;

    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;

    const onWindowMove = (moveEvent: globalThis.MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const dist = Math.hypot(dx, dy);
      if (dist >= focusOnMouseUpDragThresholdPx) {
        moved = true;
      }
    };

    const onWindowUp = () => {
      window.removeEventListener("mousemove", onWindowMove);
      window.removeEventListener("mouseup", onWindowUp);
      if (moved) return;
      const n = localRef.current;
      if (!n) return;
      if (typeof document !== "undefined" && document.activeElement === n) return;
      n.focus();
    };

    window.addEventListener("mousemove", onWindowMove);
    window.addEventListener("mouseup", onWindowUp);
  };

  return (
    <TextArea
      {...restTextAreaProps}
      id={resolvedInputId}
      name={registration.name}
      ref={(node) => {
        registration.ref(node as unknown as HTMLTextAreaElement | null);
        localRef.current = node as unknown as HTMLTextAreaElement | null;
        textAreaRef?.(localRef.current);
      }}
      defaultValue={defaultValue as string | undefined}
      onMouseDown={handleMouseDown}
      onBlur={(event) => {
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
        // Resize immediately to avoid flicker.
        runResize();
        (onChangeProp as unknown as ((e: typeof event) => void) | undefined)?.(event);
      }}
      aria-describedby={describedBy}
      aria-invalid={fieldState.invalid}
      disabled={restTextAreaProps.disabled}
      // Prevent manual resize by default (can be overridden).
      resize={restTextAreaProps.resize ?? "none"}
      // Ensure max height clamp behavior doesn't show flickery scrollbars.
      overflowY={restTextAreaProps.overflowY ?? (maxHeightPx ? "hidden" : undefined)}
    />
  );
}

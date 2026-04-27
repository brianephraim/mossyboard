import { useId, useLayoutEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { TextArea } from "@tamagui/input";
import {
  useFormContext,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type RegisterOptions,
  useWatch,
} from "react-hook-form";

// Side-effect import: installs a single window-level capture listener for
// `keydown` (Space) and `mousedown` that beats `@hello-pangea/dnd`'s
// sensors for any focused editable inside a dnd drag handle. See
// `dndInputSpaceGuard.ts` and `FormInlineTextField.tsx` for the full
// rationale on why this must be a module-level installer rather than a
// per-component layout effect.
import "./dndInputSpaceGuard";
import { joinAriaIds } from "./joinAriaIds";
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
  overflowYWhenClamped?: "auto" | "hidden";
  focusOnMouseUp?: boolean;
  focusOnMouseUpDragThresholdPx?: number;
}> &
  Omit<
    ComponentProps<typeof TextArea>,
    "aria-describedby" | "aria-invalid" | "id" | "name" | "ref" | "value"
  > & {
    // Tamagui style props (web/native unions) aren't always reflected on the
    // `TextArea` component props type, but they are supported at runtime.
    fontSize?: unknown;
    fontWeight?: unknown;
    color?: unknown;
    boxShadow?: unknown;
    focusStyle?: unknown;
    focusVisibleStyle?: unknown;
  };

const DEFAULT_DRAG_THRESHOLD_PX = 5;

function resizeTextArea(
  node: HTMLTextAreaElement,
  {
    minHeightPx,
    maxHeightPx,
    overflowYWhenClamped,
  }: {
    minHeightPx?: number;
    maxHeightPx?: number;
    overflowYWhenClamped?: "auto" | "hidden";
  },
) {
  node.style.height = "auto";
  const min = minHeightPx ?? 0;
  const raw = node.scrollHeight;
  const desired = Math.max(raw, min);

  if (maxHeightPx !== undefined && desired > maxHeightPx) {
    node.style.height = `${maxHeightPx}px`;
    node.style.overflowY = overflowYWhenClamped ?? "auto";
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
  overflowYWhenClamped,
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
    resizeTextArea(node, { minHeightPx, maxHeightPx, overflowYWhenClamped });
  };

  // Resize on mount and when the value changes externally.
  useLayoutEffect(() => {
    runResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValue, minHeightPx, maxHeightPx]);
  // The window-level keydown + mousedown guards live in `dndInputSpaceGuard`
  // (imported above for its side effect). They cover this textarea without
  // per-instance setup.

  const handleMouseDown = (event: unknown) => {
    (onMouseDownProp as unknown as ((e: unknown) => void) | undefined)?.(event);
    if (!focusOnMouseUp) return;

    const node = localRef.current;
    const alreadyFocused =
      typeof document !== "undefined" && node !== null && document.activeElement === node;
    if (alreadyFocused) {
      return;
    }

    (event as { preventDefault?: () => void }).preventDefault?.();

    if (typeof window === "undefined") return;

    const { clientX: startX, clientY: startY } = event as {
      clientX: number;
      clientY: number;
    };
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
      ref={(node: unknown) => {
        registration.ref(node as unknown as HTMLTextAreaElement | null);
        localRef.current = node as HTMLTextAreaElement | null;
        // Disable manual resize by default; caller can override via their own styles.
        if (localRef.current) {
          localRef.current.style.resize = "none";
        }
        textAreaRef?.(localRef.current);
      }}
      defaultValue={defaultValue as string | undefined}
      onMouseDown={handleMouseDown as unknown as ComponentProps<typeof TextArea>["onMouseDown"]}
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
    />
  );
}

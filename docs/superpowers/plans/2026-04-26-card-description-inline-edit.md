# Card Description Inline Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make card descriptions inline editable in the board canvas using an auto-growing textarea that preserves native textarea behavior and works inside the card drag handle.

**Architecture:** Add a reusable RHF-bound auto-growing Tamagui `TextArea` primitive in `src/form`, plus a small “one-field inline submit” wrapper that supports empty values (unlike `FormInlineRenameField`). Wire it into `CardInterior` to update card descriptions via the existing `card.update` mutation plumbing.

**Tech Stack:** React, TypeScript, react-hook-form, Tamagui (`TextArea`), @hello-pangea/dnd, Vitest + Testing Library.

---

## File structure / units

- Create: `src/form/FormInlineAutoGrowTextAreaField.tsx`
  - RHF-bound `TextArea` (bind by `name`) with auto-grow behavior (web) and optional `minHeight` / `maxHeight`.
  - Supports `focusOnMouseUp` + drag threshold (same behavior as `FormInlineTextField`) for dnd coexistence.
  - While focused, installs window-capture guard to preserve native cursor placement / drag-to-select behavior.
- Create: `src/form/FormInlineSubmitField.tsx`
  - Small wrapper owning a one-field RHF form that submits on blur/Enter and supports configurable normalization + empty-allowed behavior.
- Modify: `src/form/index.ts`
  - Export new components.
- Modify: `src/features/boards/BoardCanvas/CardInterior.tsx`
  - Replace description read-only `Text` with inline auto-growing textarea field and save callback wiring.
- Test: `src/features/boards/BoardCanvas.inline-edit-card-description.test.tsx` (new)
  - Covers blur save, Enter+immediate-blur single submit, and Open button unaffected.

---

## Task 1: Add RHF-bound auto-growing textarea primitive

**Files:**

- Create: `src/form/FormInlineAutoGrowTextAreaField.tsx`
- Modify: `src/form/index.ts`
- Test: (optional) `src/form/FormInlineAutoGrowTextAreaField.test.tsx`

- [ ] **Step 1: Create `FormInlineAutoGrowTextAreaField` skeleton**

Create `src/form/FormInlineAutoGrowTextAreaField.tsx`:

```tsx
import { useLayoutEffect, useRef } from "react";
import type { ComponentProps, MouseEvent as ReactMouseEvent } from "react";
import { TextArea } from "@tamagui/input";
import {
  useFormContext,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";

import { joinAriaIds } from "./FormFieldFrame";
import { readTamaguiTextInputValue } from "./tamaguiFieldAdapters";

type Props<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = Readonly<{
  additionalDescribedBy?: string;
  "aria-label": string;
  defaultValue?: FieldPathValue<TFieldValues, TName>;
  inputId?: string;
  name: TName;
  rules?: RegisterOptions<TFieldValues, TName>;
  minHeightPx?: number;
  maxHeightPx?: number;
  focusOnMouseUp?: boolean;
  focusOnMouseUpDragThresholdPx?: number;
}> &
  Omit<
    ComponentProps<typeof TextArea>,
    "aria-describedby" | "aria-invalid" | "id" | "name" | "ref" | "value" | "defaultValue"
  >;

const DEFAULT_DRAG_THRESHOLD_PX = 5;

function resizeTextArea(
  node: HTMLTextAreaElement,
  { minHeightPx, maxHeightPx }: { minHeightPx?: number; maxHeightPx?: number },
) {
  node.style.height = "auto";
  const raw = node.scrollHeight;
  const min = minHeightPx ?? 0;
  const desired = Math.max(raw, min);
  if (maxHeightPx !== undefined && desired > maxHeightPx) {
    node.style.height = `${maxHeightPx}px`;
    node.style.overflowY = "auto";
  } else {
    node.style.height = `${desired}px`;
    node.style.overflowY = "hidden";
  }
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
  minHeightPx,
  maxHeightPx,
  focusOnMouseUp = false,
  focusOnMouseUpDragThresholdPx = DEFAULT_DRAG_THRESHOLD_PX,
  ...textAreaProps
}: Props<TFieldValues, TName>) {
  const { register, setValue, getFieldState, formState } = useFormContext<TFieldValues>();
  const fieldState = getFieldState(name, formState);
  const registration = register(name, rules);
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  const describedBy = joinAriaIds(additionalDescribedBy);
  const resolvedId = inputId ?? `${String(name)}-field`;

  const {
    onBlur: onBlurProp,
    onChange: onChangeProp,
    onMouseDown: onMouseDownProp,
    ...rest
  } = textAreaProps;

  // Keep height in sync on mount + external value changes.
  const value = (formState.defaultValues as any)?.[name as any];
  useLayoutEffect(() => {
    const node = localRef.current;
    if (!node) return;
    resizeTextArea(node, { minHeightPx, maxHeightPx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minHeightPx, maxHeightPx, (textAreaProps as any).value, defaultValue]);

  // focusOnMouseUp behavior: same approach as FormInlineTextField (implementation will copy the
  // proven logic from that component: window capture guard when focused, plus mouseup-focus when
  // not yet focused and gesture stayed under threshold).
  const handleMouseDown = (event: ReactMouseEvent<HTMLTextAreaElement>) => {
    onMouseDownProp?.(event);
    if (!focusOnMouseUp) return;
    event.preventDefault();
    // Implementation detail: register window mousemove+mouseup, and on mouseup if movement < threshold
    // and textarea wasn't already focused, call localRef.current?.focus().
    // (Copy from FormInlineTextField with textarea-specific types.)
  };

  return (
    <TextArea
      {...rest}
      id={resolvedId}
      name={registration.name}
      ref={(node: HTMLTextAreaElement | null) => {
        // RHF wants the ref; Tamagui TextArea forwards to the underlying textarea on web.
        registration.ref(node as unknown as HTMLTextAreaElement);
        localRef.current = node;
      }}
      defaultValue={defaultValue as string | undefined}
      onMouseDown={handleMouseDown}
      onBlur={(event) => {
        registration.onBlur(event as unknown as Parameters<typeof registration.onBlur>[0]);
        (onBlurProp as unknown as ((e: typeof event) => void) | undefined)?.(event);
      }}
      onChange={(event) => {
        const next = readTamaguiTextInputValue(
          event as unknown as Parameters<typeof readTamaguiTextInputValue>[0],
        );
        setValue(name, next as FieldPathValue<TFieldValues, TName>, {
          shouldDirty: true,
          shouldTouch: true,
        });
        const node = localRef.current;
        if (node) resizeTextArea(node, { minHeightPx, maxHeightPx });
        (onChangeProp as unknown as ((e: typeof event) => void) | undefined)?.(event);
      }}
      aria-describedby={describedBy}
      aria-invalid={fieldState.invalid}
      disabled={rest.disabled}
      // Prevent manual resize by default; can be overridden by caller.
      resize={rest.resize ?? "none"}
    />
  );
}
```

Notes:

- In Step 3 we will complete `focusOnMouseUp` support by copying the known-good logic from `FormInlineTextField` (including window-capture guard while focused).
- Keep `overflowY` behavior consistent with `maxHeightPx`.

- [ ] **Step 2: Export from `src/form/index.ts`**

Add:

```ts
export { FormInlineAutoGrowTextAreaField } from "./FormInlineAutoGrowTextAreaField";
```

- [ ] **Step 3: Implement focus-on-mouseup + focused selection guard**

Copy the following from `src/form/FormInlineTextField.tsx` and adapt for textarea:

- window-level capture mousedown listener:
  - while focused and event target is inside textarea, call `stopImmediatePropagation()` (do NOT preventDefault)
- mouse gesture tracking:
  - on mousedown prevent default
  - track movement distance on window mousemove
  - on mouseup: if movement < threshold and textarea not already focused, call `focus()`

- [ ] **Step 4: Format**

Run:

`npx prettier --write src/form/FormInlineAutoGrowTextAreaField.tsx src/form/index.ts`

- [ ] **Step 5: (Optional) unit test for resize logic**

Only if straightforward: stub `scrollHeight` on a textarea element and assert height is set.

- [ ] **Step 6: Commit**

```bash
git add src/form/FormInlineAutoGrowTextAreaField.tsx src/form/index.ts
git commit -m "feat(form): add auto-growing inline textarea field"
```

---

## Task 2: Add a reusable one-field inline submit wrapper that allows empty values

**Files:**

- Create: `src/form/FormInlineSubmitField.tsx`
- Modify: `src/form/index.ts`

- [ ] **Step 1: Implement wrapper**

Create `src/form/FormInlineSubmitField.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

type InlineKeyDownEvent = {
  key?: string;
  nativeEvent?: { key?: string; isComposing?: boolean; keyCode?: number };
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

export type FormInlineSubmitFieldProps<TValue> = Readonly<{
  defaultValue: TValue;
  disabled?: boolean;
  normalize: (value: TValue) => TValue;
  isNoop: (next: TValue, current: TValue) => boolean;
  onSubmitValue: (next: TValue) => Promise<void> | void;
  render: (opts: { onBlur: () => void; onKeyDown: (e: InlineKeyDownEvent) => void }) => JSX.Element;
}>;

export function FormInlineSubmitField<TValue>({
  defaultValue,
  disabled = false,
  normalize,
  isNoop,
  onSubmitValue,
  render,
}: FormInlineSubmitFieldProps<TValue>) {
  const form = useForm<{ value: TValue }>({ defaultValues: { value: defaultValue } });
  const skipNextBlurSubmitRef = useRef(false);

  useEffect(() => {
    form.reset({ value: defaultValue });
  }, [form, defaultValue]);

  const submit = form.handleSubmit(async (values) => {
    const next = normalize(values.value);
    const current = normalize(defaultValue);
    if (isNoop(next, current)) return;
    await onSubmitValue(next);
  });

  return (
    <FormProvider {...form}>
      {render({
        onBlur: () => {
          if (disabled) return;
          if (skipNextBlurSubmitRef.current) {
            skipNextBlurSubmitRef.current = false;
            return;
          }
          void submit();
        },
        onKeyDown: (event: InlineKeyDownEvent) => {
          if (event.nativeEvent?.isComposing === true || event.nativeEvent?.keyCode === 229) return;
          const key = event.key ?? event.nativeEvent?.key ?? "";
          if (key !== "Enter") return;
          if (disabled) return;
          skipNextBlurSubmitRef.current = true;
          event.preventDefault?.();
          event.stopPropagation?.();
          void submit();
          setTimeout(() => {
            skipNextBlurSubmitRef.current = false;
          }, 0);
        },
      })}
    </FormProvider>
  );
}
```

- [ ] **Step 2: Export from `src/form/index.ts`**

Add:

```ts
export { FormInlineSubmitField } from "./FormInlineSubmitField";
export type { FormInlineSubmitFieldProps } from "./FormInlineSubmitField";
```

- [ ] **Step 3: Format and commit**

```bash
npx prettier --write src/form/FormInlineSubmitField.tsx src/form/index.ts
git add src/form/FormInlineSubmitField.tsx src/form/index.ts
git commit -m "feat(form): add inline submit wrapper for one-field forms"
```

---

## Task 3: Wire inline-editable description into `CardInterior`

**Files:**

- Modify: `src/features/boards/BoardCanvas/CardInterior.tsx`

- [ ] **Step 1: Replace description display with editable field**

Replace:

- the `Text numberOfLines={3}` block and “No description yet.” block

With:

```tsx
<FormInlineSubmitField<string>
  defaultValue={card.description}
  normalize={(value) => value}
  isNoop={(next, current) => next === current}
  onSubmitValue={async (nextDescription) => {
    await onRenameTitle({
      cardId: card.id,
      title: card.title,
      description: nextDescription,
      priority: card.priority,
      expectedVersion: card.version,
    });
  }}
  render={({ onBlur, onKeyDown }) => (
    <FormInlineAutoGrowTextAreaField<{ value: string }, "value">
      name="value"
      aria-label="Card description"
      defaultValue={card.description}
      focusOnMouseUp
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      color="$boardTextMuted"
      fontSize="$3"
      borderWidth={1}
      borderRadius="$4"
      borderColor="transparent"
      backgroundColor="transparent"
      paddingHorizontal={0}
      paddingVertical={0}
      minHeightPx={24}
      maxHeightPx={180}
      focusStyle={{ outlineWidth: 0 }}
      focusVisibleStyle={{
        outlineWidth: 0,
        backgroundColor: "$boardPanelSurfaceStrong",
        borderColor: "$boardAccent",
        boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
      }}
    />
  )}
/>
```

Notes:

- This uses the existing `onRenameTitle` card update callback (already plumbed for titles) so we do not add new mutation plumbing.
- Empty description is allowed; no “reset on empty”.

- [ ] **Step 2: Format + run focused tests**

```bash
npx prettier --write src/features/boards/BoardCanvas/CardInterior.tsx
npx vitest run src/features/boards/BoardCanvas.inline-edit-card-title.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/boards/BoardCanvas/CardInterior.tsx
git commit -m "feat(boards): inline-edit card descriptions in canvas"
```

---

## Task 4: Add integration test for inline description editing

**Files:**

- Create: `src/features/boards/BoardCanvas.inline-edit-card-description.test.tsx`

- [ ] **Step 1: Write test**

Use `src/features/boards/BoardCanvas.inline-edit-card-title.test.tsx` as template and assert:

- blur saves: editing “Card description” and blurring calls `onRenameCardTitle` with updated description, unchanged title/priority, and `expectedVersion`.
- Enter saves: keydown Enter then immediate blur calls once.
- Open still works and does not focus the description textarea.

- [ ] **Step 2: Run test + commit**

```bash
npx vitest run src/features/boards/BoardCanvas.inline-edit-card-description.test.tsx
git add src/features/boards/BoardCanvas.inline-edit-card-description.test.tsx
git commit -m "test(boards): cover inline card description edit"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run focused suite**

```bash
npx vitest run \
  src/form/FormInlineTextField.test.tsx \
  src/features/boards/BoardCanvas.inline-edit-card-title.test.tsx \
  src/features/boards/BoardCanvas.inline-edit-card-description.test.tsx
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

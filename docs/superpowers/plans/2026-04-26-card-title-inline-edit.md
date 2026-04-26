# Card Title Inline Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make card titles inline editable in the board canvas (save on blur/Enter) while preserving drag-and-drop and “Open” button behavior.

**Architecture:** Implement card title inline rename by reusing the existing RHF-bound inline field primitive (`FormInlineTextField`) and introducing a small reusable “one-field inline rename form” wrapper so board/column/card inline renames share identical trimming/no-op behavior and handler wiring.

**Tech Stack:** React, TypeScript, react-hook-form, Tamagui, tRPC, @hello-pangea/dnd, Vitest + Testing Library.

---

## File structure / units

- Create: `src/form/FormInlineRenameField.tsx`
  - Owns RHF one-field form, reset-on-prop-change, trim/no-op/empty handling, blur + Enter submit wiring.
  - Renders `FormProvider` + `FormInlineTextField`.
- Modify: `src/features/boards/BoardCanvas/CardInterior.tsx`
  - Replace card title `<Text>` with `FormInlineRenameField` and call the existing `card.update` mutation on submit.
  - Ensure “Open” button behavior remains unchanged.
- Modify (refactor): `src/features/boards/BoardCanvas/ColumnHeader.tsx`
  - Replace the inline RHF setup with `FormInlineRenameField` to prove the abstraction and avoid divergence.
- Modify (refactor): `src/features/boards/EditableBoardTitle.tsx`
  - Replace the inline RHF setup with `FormInlineRenameField` to keep all inline rename behavior consistent.
- Test: `src/features/boards/BoardCanvas.inline-edit-card-title.test.tsx` (new)
  - Covers blur/Enter save and “Open” button behavior.

## Task 1: Create reusable inline rename wrapper (`FormInlineRenameField`)

**Files:**

- Create: `src/form/FormInlineRenameField.tsx`
- Modify: `src/form/index.ts`
- Test: `src/form/FormInlineRenameField.test.tsx` (optional; only if we can do it cleanly without over-mocking)

- [ ] **Step 1: Add component skeleton**

Create `src/form/FormInlineRenameField.tsx`:

```tsx
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { FormInlineTextField } from "./FormInlineTextField";

export type FormInlineRenameFieldProps = {
  ariaLabel: string;
  defaultValue: string;
  disabled?: boolean;
  focusOnMouseUp?: boolean;
  maxLength?: number;
  onSubmitTitle: (nextTitle: string) => Promise<void> | void;
  inputProps?: Omit<
    React.ComponentProps<typeof FormInlineTextField<{ title: string }, "title">>,
    | "name"
    | "defaultValue"
    | "disabled"
    | "aria-label"
    | "focusOnMouseUp"
    | "maxLength"
    | "onBlur"
    | "onKeyDown"
  >;
};

export function FormInlineRenameField({
  ariaLabel,
  defaultValue,
  disabled = false,
  focusOnMouseUp = false,
  maxLength,
  onSubmitTitle,
  inputProps,
}: Readonly<FormInlineRenameFieldProps>) {
  const form = useForm<{ title: string }>({ defaultValues: { title: defaultValue } });

  useEffect(() => {
    form.reset({ title: defaultValue });
  }, [form, defaultValue]);

  const submit = form.handleSubmit(async (values) => {
    const next = values.title.trim();
    if (!next) {
      form.reset({ title: defaultValue });
      return;
    }
    if (next === defaultValue) {
      return;
    }
    await onSubmitTitle(next);
  });

  return (
    <FormProvider {...form}>
      <FormInlineTextField<{ title: string }, "title">
        name="title"
        aria-label={ariaLabel}
        defaultValue={defaultValue}
        disabled={disabled}
        focusOnMouseUp={focusOnMouseUp}
        maxLength={maxLength}
        onBlur={() => {
          if (disabled) return;
          void submit();
        }}
        onKeyDown={(event: { key?: string; nativeEvent?: { key?: string } }) => {
          const key = event.key ?? event.nativeEvent?.key ?? "";
          if (key === "Enter") {
            void submit();
          }
        }}
        {...(inputProps ?? {})}
      />
    </FormProvider>
  );
}
```

- [ ] **Step 2: Export from `src/form/index.ts`**

Add:

```ts
export { FormInlineRenameField } from "./FormInlineRenameField";
export type { FormInlineRenameFieldProps } from "./FormInlineRenameField";
```

- [ ] **Step 3: Format**

Run:

`npx prettier --write src/form/FormInlineRenameField.tsx src/form/index.ts`

- [ ] **Step 4: (Optional) Add a light unit test**

Only if straightforward: a test that verifies trim/no-op/empty-reset behavior by stubbing `onSubmitTitle` and firing blur and Enter.

- [ ] **Step 5: Commit**

```bash
git add src/form/FormInlineRenameField.tsx src/form/index.ts
git commit -m "feat(form): add inline rename field wrapper"
```

## Task 2: Refactor column title inline rename to use `FormInlineRenameField`

**Files:**

- Modify: `src/features/boards/BoardCanvas/ColumnHeader.tsx`
- Test: existing `src/features/boards/BoardCanvas.inline-rename.test.tsx`

- [ ] **Step 1: Replace local RHF wiring with `FormInlineRenameField`**

In `ColumnHeaderWithInlineRename`, remove `useForm`, `FormProvider`, `useEffect(form.reset...)`, and the local `submit` handler. Replace with:

```tsx
<FormInlineRenameField
  ariaLabel="Column title"
  defaultValue={lane.title}
  disabled={blockActions}
  focusOnMouseUp
  onSubmitTitle={(nextTitle) =>
    onRenameColumn({ columnId, title: nextTitle, expectedVersion: version })
  }
  inputProps={{
    width: "auto",
    maxWidth: "100%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    color: "$boardHeading",
    fontSize: "$6",
    fontWeight: "800",
    borderWidth: 1,
    borderRadius: "$4",
    borderColor: "transparent",
    backgroundColor: "transparent",
    boxShadow: "transparent 0px 0px 0px 0px",
    paddingHorizontal: 0,
    paddingVertical: 0,
    focusStyle: { outlineWidth: 0 },
    focusVisibleStyle: {
      outlineWidth: 0,
      backgroundColor: "$boardPanelSurfaceStrong",
      borderColor: "$boardAccent",
      boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
    },
  }}
/>
```

- [ ] **Step 2: Run tests**

Run:

`npx vitest run src/features/boards/BoardCanvas.inline-rename.test.tsx`

Expected: PASS.

- [ ] **Step 3: Format**

`npx prettier --write src/features/boards/BoardCanvas/ColumnHeader.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/features/boards/BoardCanvas/ColumnHeader.tsx
git commit -m "refactor(boards): reuse inline rename field for columns"
```

## Task 3: Refactor board title inline rename to use `FormInlineRenameField`

**Files:**

- Modify: `src/features/boards/EditableBoardTitle.tsx`
- Test: `src/features/boards/EditableBoardTitle.test.tsx`

- [ ] **Step 1: Replace local RHF wiring with `FormInlineRenameField`**

Use:

```tsx
<FormInlineRenameField
  ariaLabel="Board title"
  defaultValue={title}
  disabled={disabled}
  maxLength={80}
  onSubmitTitle={(nextTitle) => onSave(nextTitle)}
  inputProps={{
    width: "auto",
    maxWidth: "100%",
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: "flex-start",
    color: "$boardHeading",
    fontSize: "$10",
    fontWeight: "800",
    height: 72,
    borderWidth: 1,
    borderRadius: "$4",
    borderColor: "transparent",
    backgroundColor: "transparent",
    boxShadow: "transparent 0px 0px 0px 0px",
    paddingHorizontal: 10,
    marginHorizontal: -10,
    marginTop: -4,
    focusStyle: { outlineWidth: 0 },
    focusVisibleStyle: {
      outlineWidth: 0,
      backgroundColor: "$boardPanelSurfaceStrong",
      borderColor: "$boardAccent",
      boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
    },
  }}
/>
```

- [ ] **Step 2: Run tests**

Run:

`npx vitest run src/features/boards/EditableBoardTitle.test.tsx`

Expected: PASS.

- [ ] **Step 3: Format**

`npx prettier --write src/features/boards/EditableBoardTitle.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/features/boards/EditableBoardTitle.tsx
git commit -m "refactor(boards): reuse inline rename field for board title"
```

## Task 4: Implement inline-editable card title in `CardInterior`

**Files:**

- Modify: `src/features/boards/BoardCanvas/CardInterior.tsx`
- Modify: `src/features/boards/BoardDetailScreen.tsx` (only if needed to plumb mutation/props)

- [ ] **Step 1: Locate the card update mutation hook**

In `BoardDetailScreen.tsx`, find where `card.update` mutation is created (likely `api.card.update.useMutation(...)` or similar). Ensure we can call it from where card lists render or plumb an `onRenameCardTitle` callback down to `CardInterior`.

- [ ] **Step 2: Add `onRenameTitle` prop to `CardInterior` (if needed)**

Add to `CardInteriorProps`:

```ts
onRenameTitle?: (cardId: string, nextTitle: string, expectedVersion: number) => Promise<void> | void;
renameDisabled?: boolean;
```

Then from the list renderers (`BoardLaneView` / `StaticLaneCards`), pass these down from `BoardDetailScreen` where the mutation lives.

- [ ] **Step 3: Replace title `<Text>` with `FormInlineRenameField`**

In `CardInterior` where the title is currently:

```tsx
<Text tag="h3" fontWeight="700" color="$boardHeading" flex={1}>
  {card.title}
</Text>
```

Replace with:

```tsx
<FormInlineRenameField
  ariaLabel="Card title"
  defaultValue={card.title}
  disabled={Boolean(renameDisabled)}
  focusOnMouseUp
  maxLength={200}
  onSubmitTitle={(nextTitle) => onRenameTitle?.(card.id, nextTitle, card.version)}
  inputProps={{
    width: "auto",
    maxWidth: "100%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    color: "$boardHeading",
    fontSize: "$5",
    fontWeight: "700",
    borderWidth: 1,
    borderRadius: "$4",
    borderColor: "transparent",
    backgroundColor: "transparent",
    boxShadow: "transparent 0px 0px 0px 0px",
    paddingHorizontal: 0,
    paddingVertical: 0,
    focusStyle: { outlineWidth: 0 },
    focusVisibleStyle: {
      outlineWidth: 0,
      backgroundColor: "$boardPanelSurfaceStrong",
      borderColor: "$boardAccent",
      boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
    },
  }}
/>
```

- [ ] **Step 4: Ensure “Open” button remains clickable**

No global click handlers should be added. Verify the “Open” button still uses `onPress={onOpen}` and is not inside any pointer-capture logic.

- [ ] **Step 5: Format**

`npx prettier --write src/features/boards/BoardCanvas/CardInterior.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/features/boards/BoardCanvas/CardInterior.tsx src/features/boards/BoardDetailScreen.tsx src/features/boards/BoardCanvas/BoardLaneView.tsx src/features/boards/BoardCanvas/StaticLaneCards.tsx
git commit -m "feat(boards): inline-edit card titles in canvas"
```

## Task 5: Add integration-style test for card title inline editing

**Files:**

- Create: `src/features/boards/BoardCanvas.inline-edit-card-title.test.tsx`

- [ ] **Step 1: Copy the existing inline rename test harness**

Use `src/features/boards/BoardCanvas.inline-rename.test.tsx` as a template:

- Render the board canvas with a card.
- Mock the tRPC mutation (card.update) and assert it is called on blur and on Enter.

- [ ] **Step 2: Add “Open still works” assertion**

Click the “Open” button and assert the provided `onOpen` callback was called (and/or the modal opens), and that the card title input is not focused as a side effect.

- [ ] **Step 3: Run tests**

`npx vitest run src/features/boards/BoardCanvas.inline-edit-card-title.test.tsx`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/boards/BoardCanvas.inline-edit-card-title.test.tsx
git commit -m "test(boards): cover inline card title rename"
```

## Task 6: Final verification

**Files:**

- No new files

- [ ] **Step 1: Run focused test suite**

```bash
npx vitest run \
  src/form/FormInlineTextField.test.tsx \
  src/features/boards/EditableBoardTitle.test.tsx \
  src/features/boards/BoardCanvas.inline-rename.test.tsx \
  src/features/boards/BoardCanvas.inline-edit-card-title.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run TypeScript check (if available)**

Run:

`npm run typecheck`

Expected: PASS (or identify pre-existing failures and avoid expanding scope).

---
name: rhf-tamagui-forms
description: Use when adding, refactoring, debugging, or reviewing forms built with react-hook-form and Tamagui. Standardizes the project pattern around src/form reusable fields that bind by name through form context instead of inline Controller render props and imperative onChange wiring.
---

# RHF + Tamagui Forms

Use this skill for any non-trivial form work in this repo.

## Goal

Keep forms aligned with the shared layer in `src/form/`:

- `FormRoot`
- `FormTextField`
- `FormTextAreaField`
- `FormOptionButtonsField`
- `tamaguiFieldAdapters`

The preferred consumer API is:

- feature component owns `useForm(...)`
- JSX uses `FormRoot`
- reusable fields bind via `name`
- field wiring happens inside `src/form`, not inline in feature files

## Default pattern

1. Create `useForm(...)` in the feature component.
2. Wrap the field area with `FormRoot`.
3. Use `FormTextField`, `FormTextAreaField`, or `FormOptionButtonsField` before reaching for `Controller`.
4. Pass validation with `rules`.
5. Let the shared field own:
   - `field.ref`
   - `value`
   - `onBlur`
   - Tamagui `onChange` adaptation
   - `aria-invalid`
   - `aria-describedby`
   - inline error rendering
6. Keep submit behavior semantic:
   - use a real form submit when possible
   - for modal footers outside the form body, submit via `form` id targeting

## Inline “one-field form” pattern (board title style)

For inline edits that still need a save lifecycle (trim, reset, API call) but do **not** need multi-field validation UI, prefer a minimal RHF form and submit on blur:

- Feature component owns `useForm({ defaultValues })`.
- Field binds by `name`.
- `onBlur` calls `form.handleSubmit(...)` (no custom draft/editing state).
- In the submit handler: `trim`, ignore blank, ignore unchanged, otherwise call the mutation.
- If blank: `form.reset({ ...defaults })`.

This avoids extra state (`editing`, `draft`, “skip blur save” flags) while still keeping behavior deterministic and testable.

## Critical pitfall: do not clobber consumer handlers in shared fields

When building `src/form/*Field` primitives, **compose** handlers instead of overwriting them:

- Call RHF’s handler first (`field.onBlur()`, `field.onChange(...)`)
- Then call the consumer prop (`onBlurProp?.(event)`, `onChangeProp?.(event)`)

If you overwrite `onBlur`/`onChange` with RHF handlers, feature-level behavior like “save on blur” silently stops working.

## Inline edit inside a `@hello-pangea/dnd` drag handle

When an inline-edit input lives inside a draggable region (e.g. a column header that is also a drag handle), several things fight each other: dnd by default refuses drags from interactive elements (`<input>`, `<button>`, ...), the browser focuses an input on `mousedown` (which "wins" over an intent-to-drag), dnd's mouse sensor calls `event.preventDefault()` on mousedown once it acquires a lock (which suppresses the browser's native cursor-positioning and text-select drag inside the input), and dnd swallows clicks once a drag has started.

The supported pattern in this repo:

1. On the parent `<Draggable>`, set `disableInteractiveElementBlocking` so dnd will start a drag from the input region. Without this, dragging from the input area silently does nothing.
2. On the inline field, pass `focusOnMouseUp` (and optionally `focusOnMouseUpDragThresholdPx`). The field defers focus to `mouseup` and only focuses if the press did not move past the threshold.
3. The field also installs a window-level capture-phase mousedown listener that, while the input is focused, calls `event.stopImmediatePropagation()` — registered before dnd's listener because React effects fire child-first — so dnd's mouse sensor never runs for that gesture and the browser's native cursor-positioning / drag-to-select behavior keeps working inside the focused input. Do not try to fix this with React-level `stopPropagation` or `preventDefault`: dnd listens at window-capture (which React's bubble-phase `stopPropagation` does not reach), and `preventDefault` would suppress the very text-selection behavior we are trying to preserve.
4. Keep all other RHF wiring identical to the inline-form pattern above (submit on blur, no extra editing state).

Reach for this pattern only when an input has to coexist with a drag handle. For a plain inline rename with no surrounding drag handle, do not opt in — `focusOnMouseUp` adds latency and is unnecessary.

### Pitfall: do not short-circuit `mousedown` on `defaultPrevented`

`@hello-pangea/dnd`'s window-capture mousedown handler runs before any element-level handler and calls `event.preventDefault()` once it locks a draggable. The `focusOnMouseUp` element handler must keep running (to register `mouseup` focus) **even when `event.defaultPrevented` is already `true`** — that's exactly the case it exists to recover from. Treat `defaultPrevented` as informational only here, not as a guard.

## Tamagui change events: always adapt through `readTamaguiTextInputValue`

Tamagui’s `Input` `onChange` can deliver non-standard event shapes (web/native-ish hybrids).

- Always use `readTamaguiTextInputValue(event)` (via `tamaguiFieldAdapters`) to derive the string value.
- Avoid assuming `event.target.value` is present.
- If a field primitive needs to call RHF with a synthetic event, ensure the adapter can read it.

## Prefer this

```tsx
const form = useForm<FormValues>({
  defaultValues: { title: "" },
});

return (
  <FormRoot
    form={form}
    onSubmit={async (values) => {
      await save(values);
    }}
  >
    <FormTextField<FormValues, "title">
      name="title"
      label="Title"
      rules={{ required: "Title is required." }}
    />
  </FormRoot>
);
```

## Avoid this by default

- inline `Controller` render props in feature files
- manual `value={field.value}` and `onChange={...field.onChange...}` repeated at each call site
- manual `watch(...)` plus `setValue(...)` for simple field binding
- duplicate label/error markup when a shared field can handle it

## When `Controller` is still acceptable

Use inline `Controller` or `useController` directly only when the existing shared field set is truly insufficient, for example:

- a custom composite input with unusual value shape
- a third-party widget that does not map cleanly to current `src/form` primitives
- a one-off case that should first become a new reusable form primitive

If you hit one of these, prefer expanding `src/form/` instead of solving it locally twice.

## Accessibility requirements

Shared form fields should preserve or improve:

- visible labels
- error text linked through `aria-describedby`
- keyboard submission
- focus targeting through `field.ref` so `setFocus(...)` works
- modal submit behavior that does not rely on click-only flows

## Tests

When changing form behavior, check the existing examples:

- `src/form/FormFields.test.tsx`
- `src/features/auth/SignInForm.test.tsx`

Add or update tests when the work changes:

- field binding behavior
- validation error display
- focus-on-error behavior
- submit behavior for modal/footer actions

## Good reference files

- `src/form/index.ts`
- `src/features/auth/SignInForm.tsx`
- `src/features/auth/SignUpForm.tsx`
- `src/features/auth/ResetPasswordForm.tsx`
- `src/features/boards/BoardShell.tsx`
- `src/features/boards/BoardDetailScreen.tsx`
- `src/features/boards/CardDetailSurface.tsx`

## Scope guidance

Not every text input needs RHF.

Keep truly local, ephemeral editing state out of RHF when it is not acting like a durable form, such as:

- quick inline rename affordances
- transient search boxes
- tiny one-field draft state with no validation or submit lifecycle

Use RHF when the UI is meaningfully a form, especially if it needs validation, reset, submit state, focus management, or multiple reusable fields.

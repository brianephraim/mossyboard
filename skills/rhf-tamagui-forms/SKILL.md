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

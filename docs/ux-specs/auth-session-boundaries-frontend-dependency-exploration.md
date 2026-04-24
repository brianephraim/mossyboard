# Frontend Dependency Exploration Memo: Authentication and Session Boundaries

## 1. Slice Name

Authentication and session boundaries

Parent UX spec: [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md)

## 2. Executive Summary

Recommendation for this slice: do not add a new frontend library yet.

The auth/session UX defined in the canonical spec can be implemented with the current stack plus project-local patterns:

- React component state for small auth forms
- TanStack Router query params for auth mode switching
- current Tamagui primitives for layout and controls
- project-required `PrettyModalWrap` for blocking session-expired dialogs

The only category that is close to a real decision point is form state + validation handling, and even there the current slice is still simple enough that a library would add more abstraction than value.

## 3. Human Decision Checklist

- [ ] Approve `no new form library` for the auth/session slice
- [ ] Approve `no new tabs/mode-switch package` for the auth/session slice
- [ ] Approve `defer drag-and-drop / sortable evaluation` until the move/reorder slice

## 4. Option Status Snapshot

### Approved

- none yet

### Deferred

- `@tanstack/react-form`
- `react-hook-form`
- `@tamagui/tabs`
- any drag-and-drop / sortable package evaluation

### Rejected for this slice

- any external modal/dialog package
- any drag-and-drop / sortable package install now

## 5. Capability Evaluation

### Capability: Drag-and-drop / sortable interactions

#### Why the UX creates this dependency question

The meta-plan requires explicit review of this category, but the auth/session slice does not contain drag, reorder, or sortable interactions.

#### Current-stack option

No library or implementation work is needed for this slice.

#### Candidate library options

- none evaluated in depth for this slice because the canonical UX spec does not require sortable behavior here

#### Accessibility and keyboard analysis

- For this slice, no drag behavior exists.
- For later Kanban move/reorder slices, keyboard alternatives will be mandatory and must be part of that future evaluation.

#### Mobile and responsiveness analysis

- No touch drag behavior exists in this slice.

#### Testing and maintenance analysis

- Deferring avoids premature commitment before the card/column interaction model is fully specified.

#### Recommendation

Do not choose or install any drag-and-drop / sortable library now.

#### Human decision required

Approve deferring this category until the move/reorder slice.

#### Install timing

`not needed`

### Capability: Form state + validation handling

#### Why the UX creates this dependency question

The slice includes three user-input forms:

- sign in
- create account
- reset password

Those forms need inline validation, form-level error mapping, pending states, success states, focus movement, and server error display.

#### Current-stack option

Use local React state for field values and submission state, then map client-side validation plus server-side tRPC/Firebase errors into the UI.

Why this fits the slice:

- each auth form is small
- the fields are shallow and fixed
- there are no dynamic arrays or nested field groups
- there is no complex autosave or wizard flow
- tests remain straightforward with `@testing-library/react`

#### Candidate library options

1. `@tanstack/react-form`

Official docs: [Overview](https://tanstack.com/form/latest/docs), [Installation](https://tanstack.com/form/latest/docs/installation), [Comparison](https://tanstack.com/form/latest/docs/comparison)

Signals from the official docs:

- TanStack positions it as a headless, type-safe form library with granular reactivity.
- The installation docs include a TanStack Start adapter path.
- The comparison docs emphasize TypeScript support, headless UI, and granular reactivity.

Fit for this repo:

- good ecosystem fit with TanStack Start
- good TypeScript fit
- headless model aligns with Tamagui composition

Tradeoffs for this slice:

- adds a new dependency and abstraction layer before larger forms exist
- introduces library-specific patterns before we know if future slices truly need them

2. `react-hook-form`

Official docs: [Homepage / overview](https://react-hook-form.com/)

Signals from the official docs:

- React Hook Form describes itself as performant, flexible, extensible, and dependency-free.
- The official example shows a compact `useForm` plus `register` API for field wiring and validation.
- The docs emphasize reduced re-renders and easy adoption for local form state.

Fit for this repo:

- proven and lightweight
- good for straightforward form wiring

Tradeoffs for this slice:

- adds a new dependency outside the current TanStack-first stack
- still does not remove the need to design focus management, live announcements, or auth-specific error mapping
- may encourage a second layer of conventions before the app has enough form complexity to justify standardization

#### Accessibility and keyboard analysis

- No form library automatically satisfies this slice's accessibility rules.
- Labels, error associations, focus movement, live regions, and keyboard behavior still need explicit implementation regardless of the library.
- Because the forms are small, current-stack React state does not create an accessibility gap by itself.

#### Mobile and responsiveness analysis

- All options work on mobile.
- No candidate library offers a meaningful mobile-specific advantage for these small forms.

#### Testing and maintenance analysis

- Current-stack React state keeps tests close to user behavior with minimal mocking.
- TanStack Form and React Hook Form are both testable, but each adds framework-specific helpers and mental overhead before the slice complexity demands it.
- Deferring the decision keeps the team free to revisit once card-editing and modal-heavy forms are specified.

#### Recommendation

Do not add a form library for this auth/session slice.

Revisit the choice when the repo reaches larger multi-field slices such as card create/edit or card detail editing. At that point, compare whether a standardized form abstraction would reduce duplication enough to justify adoption.

#### Human decision required

Approve `no new form library now` or explicitly choose an early standard:

- `@tanstack/react-form`
- `react-hook-form`

#### Install timing

`later`

### Capability: Auth mode switch / tab-like primitive

#### Why the UX creates this dependency question

The auth experience uses one shared route for `signin`, `signup`, and `reset`. A designer may prefer a tab-like treatment for part of that mode switching.

#### Current-stack option

Use current Tamagui primitives plus router-aware buttons or links. Keep the auth mode represented in the URL query param rather than in a separate tab-state abstraction.

#### Candidate library options

1. No new library

- use existing Tamagui buttons/text primitives
- keep mode changes URL-driven

2. `@tamagui/tabs`

Official docs: [Tamagui Tabs](https://tamagui.dev/ui/tabs)

Signals from the official docs:

- Tamagui describes Tabs as accessible and keyboard-navigable.
- The docs support controlled or uncontrolled usage.
- Tabs offer manual or automatic activation modes.

Fit for this repo:

- best add-on fit if the team decides true tab semantics are needed
- stays within the Tamagui ecosystem

Tradeoffs for this slice:

- current auth mode switching is route/query-param driven, not purely in-page content switching
- tabs semantics may be more structure than the slice needs
- another package would be added before it is clear that buttons/links are insufficient

#### Accessibility and keyboard analysis

- The current-stack option can be fully accessible if implemented as clear buttons or links with visible active state.
- `@tamagui/tabs` offers keyboard navigation out of the box, but the team still needs to ensure the URL stays authoritative for mode state.

#### Mobile and responsiveness analysis

- Both options can support small screens.
- The decisive factor is not responsiveness; it is whether the product wants tab semantics strongly enough to justify another package.

#### Testing and maintenance analysis

- Current-stack buttons/links keep route behavior explicit in tests.
- `@tamagui/tabs` would introduce another dependency and additional state coordination between tab selection and router query params.

#### Recommendation

Do not add `@tamagui/tabs` for this slice.

Use route-aware controls with current Tamagui primitives unless a later design pass proves that tab semantics materially improve the experience.

#### Human decision required

Approve `no new tabs package now` or approve `@tamagui/tabs` if the team wants true tab semantics for auth mode switching.

#### Install timing

`later`

### Capability: Modal/dialog foundation for session-expired write failures

#### Why the UX creates this dependency question

The canonical UX spec requires a blocking modal/dialog when a protected write fails because the session expired.

#### Current-stack option

Use the project-required `src/Modal/PrettyModalWrap.tsx`.

#### Candidate library options

- none recommended

#### Accessibility and keyboard analysis

- The project already has an explicit modal rule: new dialogs must use `PrettyModalWrap`.
- Introducing a separate modal library would cut against an existing accessibility and implementation convention.

#### Mobile and responsiveness analysis

- The required modal behavior is already defined in the canonical UX spec and project conventions.

#### Testing and maintenance analysis

- Reusing the project modal wrapper keeps dialog behavior consistent and reduces duplicated integration work.

#### Recommendation

Do not evaluate or add an external dialog library for this slice.

#### Human decision required

None unless the project rule changes.

#### Install timing

`not needed`

## 6. Recommendation Summary

- Recommended path for this slice: no new frontend dependencies
- Strongest defer candidate: form library choice
- Best future-fit option if the team wants early standardization: `@tanstack/react-form`
- Best Tamagui-specific add-on if the designer later insists on tab semantics: `@tamagui/tabs`

## 7. What This Means for the Frontend Brief

The frontend build brief should currently assume:

- local React state for auth forms
- route-driven auth mode switching
- current Tamagui primitives for layout and controls
- `PrettyModalWrap` for the session-expired dialog
- no drag-and-drop or sortable dependency for this slice

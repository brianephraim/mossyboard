# Frontend Build Brief: Authentication and Session Boundaries

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md)
- Wireframe brief: [`docs/ux-specs/auth-session-boundaries-wireframe-brief.md`](./auth-session-boundaries-wireframe-brief.md)
- Dependency memo: [`docs/ux-specs/auth-session-boundaries-frontend-dependency-exploration.md`](./auth-session-boundaries-frontend-dependency-exploration.md)

## 2. Dependency Decisions for This Brief

This brief assumes the current recommended path from the dependency memo:

- no new form library for this slice
- no new tabs/mode-switch package for this slice
- no drag-and-drop / sortable library for this slice
- no external modal/dialog library for this slice

If the engineer later approves a different dependency choice, update this brief before implementation begins.

## 3. Slice Goal

Build the auth/session UX so a user can enter the app, sign in, create an account, reset a password, handle email-verification requirements, sign out, and recover from session expiry without the frontend inventing behavior.

## 4. Routes and Surfaces to Build

### Route: `/`

Responsibilities:

- render the signed-out public landing state
- redirect authenticated users away from the landing route before signed-out content becomes interactive
- provide clear entry actions for sign-in and account creation

### Route: `/auth`

Responsibilities:

- host the `signin`, `signup`, and `reset` modes on one shared route
- derive mode from URL query params
- preserve `redirectTo` intent when present and safe
- render top-of-page session-expired messaging when redirected from a protected read failure

### Route: `/verify-email`

Responsibilities:

- render the verification-required gate when `REQUIRE_EMAIL_VERIFICATION` is on and the signed-in user is still unverified
- preserve and later honor the original `redirectTo` value
- block protected board content until verification succeeds

### Protected-shell integration points

Responsibilities:

- render the verification reminder banner when verification is not required and the user is still unverified
- expose a sign-out affordance from protected contexts
- surface the session-expired dialog for protected write failures
- host a dedicated polite live region for async auth/session status updates

Note: this slice must not define full board-shell UI. Use minimal integration points that later board-shell work can absorb.

## 5. Component Responsibilities

### `PublicAuthLanding`

- heading, supporting text, and entry actions for signed-out users
- authenticated redirect guard

### `AuthPageShell`

- shared layout for all auth modes
- top alert region
- mode switch controls
- secondary navigation region
- live-status region anchor

### `AuthModeSwitch`

- route-aware controls for `signin` and `signup`
- visible active-state treatment
- focus reset to the mode heading after mode changes

### `SignInForm`

- local field state for email and password
- client-side validation
- form-level error mapping
- pending-state button label
- session-expired alert rendering

### `SignUpForm`

- local field state for email and password
- client-side validation
- error mapping for duplicate-account and weak-password cases
- redirect branching based on verification requirement

### `ResetPasswordForm`

- local email field state
- success state and cooldown state
- back-to-sign-in navigation

### `VerificationReminderBanner`

- render only when `REQUIRE_EMAIL_VERIFICATION` is off and the signed-in user is still unverified
- resend verification action
- dismiss-for-session action

### `VerifyEmailGate`

- render only when `REQUIRE_EMAIL_VERIFICATION` is on and the signed-in user is still unverified
- show signed-in email reference text
- resend verification action
- refresh verification status action
- sign-out action

### `AccountSignOutControl`

- reusable sign-out affordance for protected contexts and the verification gate

### `SessionExpiredDialog`

- wrap with `PrettyModalWrap`
- open on protected write failures caused by expired auth
- show optional draft-restore warning
- support `Sign in again` and `Cancel`

### `AuthLiveRegion`

- dedicated polite live-region node for async announcements

## 6. State Ownership Expectations

### Firebase auth client state

- source of truth for signed-in user presence
- source of truth for local token updates
- source of truth for client-observed verification status refreshes

### Local React state

- auth form field values
- auth form pending/submitting state
- field-level and form-level display state
- verification resend cooldown timers
- reset-email cooldown timer
- session-expired dialog open state
- dismiss-for-session state for the reminder banner

### TanStack Query / mutation layer

- resend verification email mutation
- send password reset email mutation
- any protected route reads or protected mutations whose auth failures need to map into redirect or dialog behavior

### Redux

- do not introduce Redux for auth form state in this slice
- do not move short-lived auth UI state into Redux
- revisit only if a later slice introduces true cross-feature client state that cannot stay local

## 7. Query and Mutation Touchpoints Implied by the UX

- sign in with email/password
- create account with email/password
- sign out
- send password reset email
- send verification email
- refresh or re-check verification status
- handle unauthenticated protected reads
- handle unauthenticated protected writes

The frontend brief does not define APIs. It only requires that these touchpoints exist and produce the states described in the canonical UX spec.

## 8. Validation and Error Display Rules

- Use the exact validation and error strings from the canonical UX spec.
- Inline field errors render beneath their field and are associated with `aria-describedby`.
- Form-level errors render in the alert region above fields.
- On client validation failure, move focus to the first invalid field.
- On form-level failure without field errors, move focus to the alert region.
- Preserve entered values after failures where possible.
- Password fields may require re-entry if the underlying auth provider clears them.

## 9. Accessibility Acceptance Criteria

- Every auth control is reachable and operable by keyboard alone.
- Every form field has a visible label.
- The mode switch has a visible active state and is keyboard-operable.
- The session-expired dialog traps focus, closes on `Escape`, and restores focus on close.
- The verification reminder banner does not trap focus.
- The verification-required gate supports resend, refresh, and sign-out without pointer-only interaction.
- Async outcomes are announced through one dedicated polite live region.
- Color is never the only signal for success, error, or verification state.

## 10. Responsive Acceptance Criteria

- Landing, auth, and verification-gate layouts are single-column below 768 px.
- Form controls span full width on mobile.
- Landing CTAs stack vertically on narrow screens.
- Verification-gate actions stack vertically on narrow screens.
- The session-expired dialog becomes a bottom sheet or full-screen modal on narrow screens.
- No auth or verification surface introduces horizontal scrolling.

## 11. Visual and Composition Constraints

- Use Tamagui-first composition.
- Prefer `Stack`, `XStack`, `YStack`, `Text`, `Button`, and `Input` primitives over raw HTML elements where practical.
- Avoid `className` and ad hoc `style` usage on Tamagui components unless there is a clear need.
- Keep auth layouts clear and utilitarian rather than ornamental.
- Do not let this slice accidentally define the eventual board-shell visual system.

## 12. Interaction Edge Cases

- Authenticated user opens `/`: redirect away before signed-out content becomes interactive.
- Invalid or unsafe `redirectTo`: fall back to `/boards`.
- `redirectTo` that points back to `/auth` or `/verify-email` in the wrong context: normalize back to `/boards`.
- `REQUIRE_EMAIL_VERIFICATION=off`: authenticated unverified user can enter protected content and sees the reminder banner.
- `REQUIRE_EMAIL_VERIFICATION=on`: authenticated unverified user is routed to `/verify-email` and blocked from protected content.
- Protected read fails because auth expired: redirect to sign-in with session-expired alert.
- Protected write fails because auth expired: open the blocking dialog instead of silently dropping the change.
- Draft restore may fail: show the warning variant, but still allow re-authentication.

## 13. Implementation Guardrails

- Keep auth mode state URL-driven.
- Keep verification enforcement env-driven.
- Use `PrettyModalWrap` for the session-expired modal flow.
- Do not add a form library for this slice unless the dependency memo is explicitly updated and approved.
- Do not introduce Redux for local auth form behavior.
- Do not invent extra auth screens beyond `/`, `/auth`, and `/verify-email`.

# Canonical UX Spec: Authentication and Session Boundaries

## 1. Overview

This document defines the first Kanban UX slice: how a user enters the app, creates an account, signs in, signs out, requests password recovery, sees email-verification status, and recovers from an expired session.

This spec is the parent artifact for future auth wireframe, frontend, and backend briefs. Those derived briefs should not change the behavior defined here.

### Constraint summary

- Firebase is auth-only. App data access still goes through tRPC and the server boundary.
- TanStack Start, TanStack Router, TanStack Query, Redux Toolkit, and Tamagui are the current app foundations.
- Interactive elements must be keyboard-operable, mobile-usable, and accessible without relying on color alone.
- Protected backend access is enforced through `protectedProcedure`, verified Firebase ID tokens, and consistent `TRPCError` responses.
- Modal behavior must use `src/Modal/PrettyModalWrap.tsx` when a blocking dialog is required.
- No existing screenshots or visual references were provided for this slice at authoring time.

### Explicit non-goals for this slice

- Social sign-in providers
- Multi-factor authentication
- Invite flows and workspace membership
- Profile settings, change-email, and change-password screens
- Account deletion
- Deep board behavior beyond the auth/session boundary itself

## 2. Slice Goal

Enable a user to reliably start or recover an authenticated Kanban session and reach the correct protected destination without having to guess what happens next.

## 3. Users and Jobs to Be Done

### Primary actors

1. New user creating a Kanban account for the first time
2. Returning user signing in to continue existing work
3. Signed-in user who needs to sign out safely
4. Signed-in user whose session expires while trying to continue work

### Jobs to be done

- "Let me create an account and enter the app without confusion."
- "Let me sign in and return to the board or route I meant to open."
- "Let me recover access if I forgot my password."
- "Tell me clearly when my session is no longer valid and how to continue."

## 4. In-Scope Tasks

- View the public unauthenticated landing state
- Navigate to the auth route
- Create an account with email and password
- Sign in with email and password
- Request a password reset email
- Resend an email verification link while signed in and unverified
- Complete the verification-required gate when email verification is enforced
- Sign out from a protected area
- Recover from an expired session on a protected read
- Recover from an expired session on a protected write
- Return to the intended protected destination after successful sign-in

## 5. Out-of-Scope Tasks

- Board list creation, board loading, or board interactions
- Account settings beyond the auth/session boundary
- Organization, team, or collaborator management
- Passwordless sign-in
- Security settings such as MFA enrollment
- Legal acceptance flows beyond a basic placeholder notice

## 6. Assumptions and Dependencies

- Public landing route: `/`
- Shared auth route: `/auth`
- Verification-required gate route when enforcement is on: `/verify-email`
- Protected board home route after sign-in: `/boards`
- Protected board detail route pattern: `/boards/$boardId`
- The auth route accepts a `mode` query param with allowed values `signin`, `signup`, and `reset`.
- The auth route accepts an optional `redirectTo` query param. Only same-origin app paths beginning with `/` are valid redirect targets.
- Firebase session persistence uses the browser's local persistent auth state.
- Email-verification enforcement is controlled per environment by a boolean server flag named `REQUIRE_EMAIL_VERIFICATION`.
- If the client needs to branch before a protected request completes, the same value may be exposed as a read-only browser mirror named `VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION`; the server flag remains the source of truth.
- When the verification-required flag is off, unverified users can access boards and instead see a persistent reminder banner until verified or dismissed for the current session.
- When the verification-required flag is on, unverified users can authenticate successfully but are routed to `/verify-email` instead of protected board content until verification is complete.
- Session-expired recovery can temporarily store a restorable local draft in `sessionStorage` when the user is interrupted during a protected write flow.
- The actual protected board shell is defined in [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md). Later slices may still define account-menu/profile treatment and toast infrastructure.

## 7. Data-Scale Assumptions and Limits

- Email address input: maximum 320 characters after trimming
- Password input: minimum 6 characters, maximum 128 characters
- `redirectTo` path: maximum 1024 characters; invalid values fall back to `/boards`
- Only one auth form submission may be in flight per auth surface at a time
- Verification resend cooldown: 30 seconds after a successful send
- Password reset resend cooldown: 30 seconds after a successful send
- This slice has no pagination or virtualization needs

## 8. Workflow Definitions

### Flow 1: Unauthenticated entry from a public route

- Trigger: User opens `/` without an authenticated session.
- User intent: Understand what the product is and move into auth.
- Preconditions: No valid Firebase session is available.
- Steps:
  1. The user lands on the public landing page.
  2. The page presents primary actions for `Sign in` and `Create account`.
  3. Selecting either action routes to `/auth` with the matching `mode`.
- System responses:
  - If a prior `redirectTo` is known, it is preserved when moving from landing to auth.
  - If the user is already authenticated, `/` immediately redirects to the resolved post-sign-in destination.
- Failure cases:
  - If route data needed for the public page fails, show the landing shell with fallback copy instead of a blank page.
- Postconditions: The user reaches the appropriate auth form.

### Flow 2: Sign in from the auth page

- Trigger: User submits `/auth?mode=signin`.
- User intent: Start an authenticated session and continue to work.
- Preconditions: User has an existing email/password account.
- Steps:
  1. User enters email and password.
  2. User activates `Sign in`.
  3. Form enters submitting state.
  4. On success, the app resolves the safe redirect target.
  5. If the verification-required flag is off or the account is already verified, the user is routed to the preserved protected destination or `/boards`.
  6. If the verification-required flag is on and the account is still unverified, the user is routed to `/verify-email` with the redirect intent preserved.
- System responses:
  - The submit button is disabled during the request.
  - Inline field errors render before any generic error.
  - Successful sign-in announces completion through a polite live region before route change.
- Failure cases:
  - Invalid credentials
  - Too many attempts
  - Network/server failure
- Postconditions:
  - Success with verification required off or already verified: valid authenticated session established
  - Success with verification required on and still unverified: authenticated session established, verification-required gate shown until verification completes
  - Failure: user remains on sign-in form with values preserved except password masking remains active

### Flow 3: Create account

- Trigger: User submits `/auth?mode=signup`.
- User intent: Create a new account and start using the product.
- Preconditions: No existing account for the submitted email.
- Steps:
  1. User enters email and password.
  2. User activates `Create account`.
  3. Form enters submitting state.
  4. On success, the user is signed in immediately.
  5. If the verification-required flag is on and the new account is unverified, the app routes to `/verify-email`.
  6. If the verification-required flag is off, the app sends the user to the resolved post-sign-in destination.
  7. When the verification-required flag is off, a verification reminder banner is visible on the first protected page load.
- System responses:
  - The submit button is disabled during the request.
  - A successful account creation announces both account creation and signed-in state.
- Failure cases:
  - Email already in use
  - Weak password
  - Network/server failure
- Postconditions:
  - Success with verification required off: authenticated session established, verification reminder shown
  - Success with verification required on: authenticated session established, verification-required gate shown until verification completes
  - Failure: user remains on create-account form with email preserved

### Flow 4: Request password reset

- Trigger: User selects `Forgot password?` from sign-in and submits `/auth?mode=reset`.
- User intent: Receive a password reset email.
- Preconditions: User knows the email address for the account.
- Steps:
  1. User enters email.
  2. User activates `Send reset email`.
  3. Form enters submitting state.
  4. On success, the form remains on the same route and displays a success state.
- System responses:
  - The email input stays editable after success.
  - The resend cooldown starts after success.
- Failure cases:
  - Invalid email format
  - Too many requests
  - Network/server failure
- Postconditions:
  - Success: user sees confirmation copy and can navigate back to sign-in
  - Failure: user stays on reset view with email preserved

### Flow 5: Sign out

- Trigger: Authenticated user activates `Sign out` from the account menu or account area.
- User intent: End the current session.
- Preconditions: User currently has a valid session.
- Steps:
  1. User activates `Sign out`.
  2. Session is cleared locally.
  3. Any in-memory protected data is discarded from visible protected surfaces.
  4. User is routed to `/` with a signed-out confirmation.
- System responses:
  - The initiating control is disabled until completion.
  - If sign-out fails, the user remains signed in and sees a recoverable error.
- Failure cases:
  - Local SDK sign-out failure
  - Network/server failure if a server-side logout side effect is later introduced
- Postconditions:
  - Success: user is unauthenticated and no longer sees protected content
  - Failure: authenticated state remains active

### Flow 6: Session expires on a protected read

- Trigger: User visits a protected route or refetches protected data with an expired or invalid token.
- User intent: Continue to the protected page they expected.
- Preconditions: User previously had an authenticated session.
- Steps:
  1. Protected route loader or query receives an unauthenticated response.
  2. Current protected content is replaced with a non-sensitive loading-to-redirect state.
  3. User is routed to `/auth?mode=signin&reason=session-expired`.
  4. `redirectTo` is set to the protected route that failed.
  5. After successful sign-in, the user returns to the original route when the verification-required flag is off or the account is already verified.
  6. If sign-in succeeds but the account is still unverified and the verification-required flag is on, the user is routed to `/verify-email` with the original redirect intent preserved.
- System responses:
  - The auth page renders a session-expired alert at the top.
  - Focus lands on the alert heading after redirect.
- Failure cases:
  - Invalid `redirectTo` value falls back to `/boards`
- Postconditions:
  - Success with verification required off or already verified: user returns to intended route after sign-in
  - Success with verification required on and still unverified: user reaches the verification-required gate with redirect intent preserved
  - Failure: user remains on the auth page with session-expired messaging

### Flow 7: Session expires during a protected write

- Trigger: User attempts a protected mutation and the backend rejects it because the session is no longer valid.
- User intent: Preserve context, re-authenticate, and retry manually.
- Preconditions: User is on a protected surface with unsaved or in-progress work.
- Steps:
  1. Mutation fails with an unauthenticated error.
  2. A blocking `Session expired` dialog opens using `PrettyModalWrap`.
  3. The dialog explains that the change was not saved.
  4. If the surface exposes restorable draft fields, the current draft is serialized to `sessionStorage`.
  5. User activates `Sign in again`.
  6. User is routed to `/auth?mode=signin&reason=session-expired`.
  7. After successful sign-in, the user returns to the originating route and the draft is restored once when verification is not required or the account is already verified.
  8. If verification is required and the account is still unverified, the user is routed to `/verify-email`, and the preserved draft is restored only after verification succeeds and the original route is reopened.
- System responses:
  - Focus moves into the dialog.
  - The live region announces that the session expired and the save did not complete.
- Failure cases:
  - Draft cannot be restored because local storage is unavailable
  - Redirect target is invalid
- Postconditions:
  - Success with verification required off or already verified: user regains access and can review or resubmit the restored draft
  - Success with verification required on and still unverified: user reaches the verification-required gate before regaining access to the draft surface
  - Failure: user still reaches sign-in, but draft restoration may be skipped with a visible notice

### Flow 8: Resend verification email

- Trigger: Signed-in unverified user activates `Send verification email` from the verification banner, verification-required gate, or account area.
- User intent: Verify the email tied to the current account.
- Preconditions: User is signed in and `emailVerified` is false.
- Steps:
  1. User activates the resend action.
  2. The action enters a pending state.
  3. On success, the current verification surface remains visible and shows confirmation copy.
  4. Cooldown starts.
- System responses:
  - The resend control is disabled during the request and cooldown.
  - The live region announces success or failure.
- Failure cases:
  - Email send failure
  - Too many requests
- Postconditions:
  - Success with verification required off: verification reminder remains until the user verifies or dismisses it for the current session
  - Success with verification required on: verification-required gate remains active until verification completes
  - Failure: the originating verification surface remains visible with retry-capable error state

### Flow 9: Verification-required gate

- Trigger: Authenticated user is unverified, the verification-required flag is on, and the user attempts to enter protected board content.
- User intent: Complete the minimum required verification step and continue to the intended destination.
- Preconditions: User is signed in, `emailVerified` is false, and email verification is enforced in the current environment.
- Steps:
  1. The user is routed to `/verify-email`.
  2. The gate explains that email verification is required before continuing.
  3. The user can resend a verification email.
  4. The user can activate `Refresh status` after verifying through the email link.
  5. Once verification is detected, the user is routed to the preserved `redirectTo` destination or `/boards`.
- System responses:
  - Protected board surfaces remain hidden while the gate is active.
  - The resend control uses the same cooldown and messaging as other verification-send surfaces.
  - Refreshing verification status does not require a full page reload.
- Failure cases:
  - Verification email send failure
  - Status refresh fails
  - Redirect target is invalid
- Postconditions:
  - Success: verified user reaches intended protected destination
  - Failure: user remains on the verification-required gate with retry-capable feedback

## 9. Screen and State Inventory

| Surface                      | Route / placement                                                         | Required states                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Public landing               | `/`                                                                       | default, route-loading fallback, authenticated redirect                            |
| Auth page: sign in           | `/auth?mode=signin`                                                       | default, submitting, field error, auth error, session-expired alert                |
| Auth page: create account    | `/auth?mode=signup`                                                       | default, submitting, field error, create-account error                             |
| Auth page: reset password    | `/auth?mode=reset`                                                        | default, submitting, field error, success, send error, cooldown                    |
| Verification reminder banner | top of authenticated protected surfaces when verification is not required | default, sending, success, error, dismissed-for-session                            |
| Verification-required gate   | `/verify-email`                                                           | default, sending, resend success, resend error, refresh pending, verified redirect |
| Account menu / account area  | authenticated app shell or verification-required gate                     | idle, signing-out, sign-out error                                                  |
| Session expired dialog       | modal over protected write surface                                        | open, pending sign-in redirect, redirecting, draft-restore-warning                 |
| Global live region           | app shell, visually hidden but always mounted                             | idle, announces async status                                                       |

## 10. Detailed Surface Specs

### Surface A: Public landing

#### Purpose

Explain the product in one screen and route unauthenticated users into auth without exposing protected content.

#### Entry conditions

- User opens `/` without a valid session.

#### Content hierarchy

1. Page heading: `Kanban for focused teams`
2. Supporting text: `Sign in to access your boards, or create an account to get started.`
3. Primary action: `Sign in`
4. Secondary action: `Create account`
5. Small note: `Email and password are the only sign-in method in this version.`

#### Controls

| Control       | Type        | Label            | Behavior                      |
| ------------- | ----------- | ---------------- | ----------------------------- |
| Primary CTA   | button/link | `Sign in`        | Routes to `/auth?mode=signin` |
| Secondary CTA | button/link | `Create account` | Routes to `/auth?mode=signup` |

#### Interaction rules

- If the user already has a valid session, this surface is skipped and the user is redirected before the landing content becomes interactable.
- Initial focus lands on the page heading when this route is rendered directly.

#### Loading / error / success

- Loading fallback copy: `Loading sign-in options...`
- If route data fails, render the same heading and actions with the supporting text replaced by `Sign in to continue.`
- This surface has no explicit success state.

#### Mobile adjustments

- CTA buttons stack vertically at narrow widths.
- Supporting text remains above actions and never moves into a side-by-side layout below 768 px.

#### Accessibility notes

- Both CTAs must be buttons or links with visible labels.
- The small note is static text, not an alert.

### Surface B: Auth page shell

#### Purpose

Provide a single accessible route for sign-in, account creation, and password reset without spawning separate modal flows.

#### Entry conditions

- User opens `/auth` directly or is redirected there by the app.

#### Layout regions

1. Page heading
2. Optional alert region
3. Mode switch controls
4. Active form region
5. Secondary navigation region
6. Live status region

#### Shared controls

| Control        | Label              | Behavior                                        |
| -------------- | ------------------ | ----------------------------------------------- |
| Mode switch    | `Sign in`          | Sets `mode=signin` and focuses the heading      |
| Mode switch    | `Create account`   | Sets `mode=signup` and focuses the heading      |
| Secondary link | `Forgot password?` | Sets `mode=reset` and focuses the reset heading |
| Secondary link | `Back to sign in`  | Available from reset mode; sets `mode=signin`   |
| Secondary link | `Back to home`     | Routes to `/`                                   |

#### Shared focus behavior

- When `mode` changes, focus moves to the form heading.
- When submission fails with field errors, focus moves to the first invalid field.
- When submission fails with only a form-level error, focus moves to the alert container.
- The live region does not take focus.

#### Reduced-motion expectations

- Mode changes use no motion stronger than a 150 ms fade.
- All form-state transitions become instant when `prefers-reduced-motion` is enabled.

### Surface C: Sign-in form

#### Goal

Authenticate an existing user and send them to the correct protected destination.

#### Entry condition

- `/auth?mode=signin`

#### Content hierarchy

1. Heading: `Sign in`
2. Optional session-expired alert
3. Email field
4. Password field
5. Primary submit button
6. Secondary links

#### Field definitions

| Field    | Label      | Placeholder       | Default | Validation                              |
| -------- | ---------- | ----------------- | ------- | --------------------------------------- |
| Email    | `Email`    | `you@example.com` | empty   | required, trimmed, valid email, max 320 |
| Password | `Password` | none              | empty   | required, min 6, max 128                |

#### Controls

| Control | Label              | Enabled state                      |
| ------- | ------------------ | ---------------------------------- |
| Submit  | `Sign in`          | Enabled when no request is pending |
| Link    | `Forgot password?` | Always enabled                     |
| Link    | `Create account`   | Always enabled                     |

#### Exact copy

- Session-expired alert title: `Your session expired`
- Session-expired alert body: `Sign in again to continue where you left off.`
- Submit pending label: `Signing in...`

#### Error copy

- Invalid credentials: `Email or password is incorrect.`
- Too many attempts: `Too many attempts. Wait a minute and try again.`
- Generic failure: `We couldn't sign you in. Try again.`
- Network failure: `We couldn't reach the server. Check your connection and try again.`

#### Success behavior

- Live-region announcement: `Signed in. Redirecting.`
- Successful sign-in immediately routes away from the auth page to the protected destination or the verification-required gate, depending on verification state and environment configuration.

#### Keyboard behavior

- `Enter` submits the form from either field.
- `Tab` order: email, password, submit, forgot-password link, create-account link, back-to-home link.

### Surface D: Create-account form

#### Goal

Create a new account with the minimum required information and establish the first session.

#### Entry condition

- `/auth?mode=signup`

#### Content hierarchy

1. Heading: `Create account`
2. Intro text: `Use your email and password to create a Kanban account.`
3. Email field
4. Password field
5. Primary submit button
6. Secondary link back to sign in
7. Static note: `By creating an account, you agree to the current terms and privacy policy once those pages are added.`

#### Field definitions

| Field    | Label      | Placeholder       | Default | Validation                              |
| -------- | ---------- | ----------------- | ------- | --------------------------------------- |
| Email    | `Email`    | `you@example.com` | empty   | required, trimmed, valid email, max 320 |
| Password | `Password` | none              | empty   | required, min 6, max 128                |

#### Controls

| Control | Label             | Enabled state                      |
| ------- | ----------------- | ---------------------------------- |
| Submit  | `Create account`  | Enabled when no request is pending |
| Link    | `Sign in instead` | Always enabled                     |

#### Error copy

- Email already in use: `An account already exists for this email. Sign in instead.`
- Weak password: `Password must be at least 6 characters.`
- Generic failure: `We couldn't create your account. Try again.`
- Network failure: `We couldn't reach the server. Check your connection and try again.`

#### Success behavior

- Live-region announcement: `Account created. Redirecting.`
- If verification is not required, the first protected page after success shows the verification reminder banner.
- If verification is required, success routes to the verification-required gate instead of protected board content.

#### Keyboard behavior

- `Enter` submits the form from either field.
- `Tab` order: email, password, submit, sign-in-instead link, back-to-home link.

### Surface E: Reset-password form

#### Goal

Let a signed-out or stuck user request a password reset email without leaving the auth route.

#### Entry condition

- `/auth?mode=reset`

#### Content hierarchy

1. Heading: `Reset password`
2. Body text: `Enter your email and we'll send a password reset link.`
3. Email field
4. Primary submit button
5. Secondary link back to sign in
6. Inline success or error message

#### Field definition

| Field | Label   | Placeholder       | Default                               | Validation                              |
| ----- | ------- | ----------------- | ------------------------------------- | --------------------------------------- |
| Email | `Email` | `you@example.com` | prefilled from sign-in when available | required, trimmed, valid email, max 320 |

#### Controls

| Control | Label              | Enabled state                                                 |
| ------- | ------------------ | ------------------------------------------------------------- |
| Submit  | `Send reset email` | Enabled when no request is pending and cooldown is not active |
| Link    | `Back to sign in`  | Always enabled                                                |

#### Exact copy

- Pending label: `Sending...`
- Success message: `Password reset email sent. Check your inbox for the reset link.`
- Cooldown helper: `You can request another email in 30 seconds.`

#### Error copy

- Invalid email: `Enter a valid email address.`
- Too many requests: `Too many requests. Wait a minute and try again.`
- Generic failure: `We couldn't send the reset email. Try again.`

#### Keyboard behavior

- `Enter` submits the form.
- Focus moves to the inline success message after a successful send.

### Surface F: Verification reminder banner

#### Goal

Prompt signed-in unverified users to verify their email without blocking the rest of the app.

#### Entry condition

- User is authenticated, `emailVerified` is false, and the verification-required flag is off.

#### Content

- Banner title: `Verify your email`
- Banner body: `Check your inbox to verify this account. You can keep using the app while verification is pending.`

#### Controls

| Control          | Label                     | Behavior                                         |
| ---------------- | ------------------------- | ------------------------------------------------ |
| Primary action   | `Send verification email` | Sends a verification link to the signed-in email |
| Secondary action | `Dismiss`                 | Hides the banner for the current session only    |

#### State copy

- Success: `Verification email sent.`
- Error: `We couldn't send the verification email. Try again.`
- Cooldown helper: `You can request another email in 30 seconds.`

#### Interaction rules

- Dismissing the banner does not change verification status.
- The banner returns on the next full session if the user is still unverified.

#### Accessibility notes

- The banner must not trap focus.
- Success and error messages are announced via the global live region.

### Surface G: Verification-required gate

#### Goal

Block access to protected board content until a signed-in user verifies their email when the current environment requires verification.

#### Entry condition

- User is authenticated, `emailVerified` is false, and the verification-required flag is on.

#### Content hierarchy

1. Heading: `Verify your email to continue`
2. Body text: `Check your inbox for a verification link. Once your email is verified, you can continue to your boards.`
3. Signed-in email summary
4. Primary action row
5. Secondary support text
6. Sign-out option

#### Controls

| Control          | Label                     | Behavior                                               |
| ---------------- | ------------------------- | ------------------------------------------------------ |
| Primary action   | `Send verification email` | Sends a verification link to the signed-in email       |
| Secondary action | `Refresh status`          | Re-checks verification status and redirects on success |
| Tertiary action  | `Sign out`                | Signs out and returns the user to `/`                  |

#### Exact copy

- Helper text: `You can keep this page open while you verify your email.`
- Refresh pending label: `Checking verification status...`
- Verified success message: `Email verified. Redirecting.`
- Refresh error message: `We couldn't confirm your verification status. Try again.`

#### Interaction rules

- This surface is the only in-app destination available to an authenticated unverified user while verification is required.
- If the user opens a protected board route directly while still unverified, the app redirects here and preserves the original `redirectTo` value.
- The signed-in email address is shown as read-only reference text so the user knows which inbox to check.

#### Focus and keyboard behavior

- Initial focus lands on the page heading.
- `Tab` order: send verification email, refresh status, sign out.
- `Enter` and `Space` activate the focused control.

#### Loading / error / success

- Default helper: `Open the verification email, confirm your address, then return here and refresh your status.`
- Send success: `Verification email sent.`
- Send error: `We couldn't send the verification email. Try again.`
- Refresh success: `Email verified. Redirecting.`
- Refresh failure: `We couldn't confirm your verification status. Try again.`

#### Mobile adjustments

- Actions stack vertically below 768 px.
- The signed-in email may wrap across lines but must remain fully visible.

#### Accessibility notes

- This surface must not auto-refresh in a way that steals focus.
- Success and failure states announce through the global live region.

### Surface H: Account sign-out control

#### Goal

Let an authenticated user end the current session from any protected shell.

#### Entry condition

- User is authenticated and either the protected app shell or the verification-required gate is visible.

#### Control

| Control             | Label      | Behavior                              |
| ------------------- | ---------- | ------------------------------------- |
| Menu item or button | `Sign out` | Signs out and returns the user to `/` |

#### States

- Pending label: `Signing out...`
- Success announcement: `Signed out.`
- Error message: `We couldn't sign you out. Try again.`

#### Keyboard behavior

- If the control sits inside a menu, standard menu keyboard behavior applies.
- If it is a standalone button, `Enter` and `Space` both activate it.

### Surface I: Session expired dialog

#### Goal

Interrupt a failed protected write with a clear recovery path instead of silently dropping the user into a broken state.

#### Entry condition

- A protected mutation fails because the session is no longer valid.

#### Layout regions

1. Title
2. Explanatory body
3. Optional draft-restore note
4. Primary action
5. Secondary action

#### Exact copy

- Title: `Session expired`
- Body: `Your change was not saved because your session expired. Sign in again to continue.`
- Draft note when applicable: `We'll restore your unsaved changes after you sign in again.`

#### Controls

| Control          | Label           | Behavior                                                                              |
| ---------------- | --------------- | ------------------------------------------------------------------------------------- |
| Primary action   | `Sign in again` | Stores restorable draft when available, closes the dialog, routes to `/auth`          |
| Secondary action | `Cancel`        | Closes the dialog and leaves the user on the current page without retrying the action |

#### Focus and keyboard behavior

- Initial focus lands on `Sign in again`.
- `Tab` cycles within the dialog.
- `Escape` closes the dialog and leaves the user on the current page.
- On close by `Cancel`, focus returns to the triggering control when it still exists.

#### Error handling

- If draft storage fails, the dialog remains open and adds a warning: `We couldn't save your unsaved changes locally. You can still sign in again.`

## 11. Cross-Screen Interaction Rules

### Verification enforcement mode

- Email verification behavior is controlled by the environment-level verification-required flag.
- When the flag is off:
  - Unverified users can access protected board surfaces.
  - The verification reminder banner is shown on protected surfaces until the user verifies or dismisses it for the current session.
- When the flag is on:
  - Unverified users can authenticate but cannot access protected board routes, board data views, or board mutations until verification completes.
  - The verification-required gate is the only in-app destination available after authentication until verification completes.
  - The original protected destination is preserved and used after verification succeeds.

### Redirect resolution

- If `redirectTo` is absent, empty, invalid, or points to `/auth`, redirect to `/boards`.
- If the verification-required gate is active and `redirectTo` points to `/verify-email`, fall back to `/boards`.
- If a user signs in from a protected-route redirect, the auth page must not offer a different destination choice.

### Session observation

- Auth state changes must update the app shell without requiring a full page reload.
- When sign-out completes in one tab, any later protected request in another tab must resolve to the signed-out or session-expired flow rather than exposing stale protected content.
- When verification status changes from unverified to verified, the app reevaluates access and leaves the verification-required gate without requiring a full reload.

### Save behavior

- Auth forms use explicit submit actions only. There is no autosave.
- When a session expires during a write, the failed action is never retried automatically after sign-in. The user must review and submit again.

### Announcement rules

- All async auth outcomes announce through a single polite live region.
- Required announcements:
  - `Signed in. Redirecting.`
  - `Account created. Redirecting.`
  - `Signed out.`
  - `Password reset email sent. Check your inbox for the reset link.`
  - `Verification email sent.`
  - `Email verified. Redirecting.`
  - `Your session expired. Sign in again to continue.`
  - `Your session expired. Your change was not saved.`

### Focus restoration

- Route entry focuses the page heading unless an alert or invalid field should receive focus first.
- Dialog close restores focus to the invoking element when it still exists.
- Redirected auth entry from session expiry focuses the session-expired alert heading.

### Tone rules

- Use sentence case for headings, buttons, and alerts.
- Error messages state the problem first and the recovery action second.
- Destructive language is not needed for sign-out or auth recovery.

## 12. Undo and Redo Rules

- Sign-in, create-account, password-reset send, verification resend, and sign-out are not undoable.
- Session-expired interruption is also not undoable; the recovery path is re-authentication plus a manual retry.
- No auth flow in this slice exposes keyboard undo or toast-based undo affordances.

## 13. Microcopy, Tone, and Announcement Strings

| Type                         | Identifier                    | Exact string                                                                                              |
| ---------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| Landing heading              | `landing.heading`             | `Kanban for focused teams`                                                                                |
| Landing body                 | `landing.body`                | `Sign in to access your boards, or create an account to get started.`                                     |
| Landing note                 | `landing.note`                | `Email and password are the only sign-in method in this version.`                                         |
| Alert title                  | `auth.sessionExpired.title`   | `Your session expired`                                                                                    |
| Alert body                   | `auth.sessionExpired.body`    | `Sign in again to continue where you left off.`                                                           |
| Verification gate heading    | `auth.verifyRequired.heading` | `Verify your email to continue`                                                                           |
| Verification gate body       | `auth.verifyRequired.body`    | `Check your inbox for a verification link. Once your email is verified, you can continue to your boards.` |
| Sign-in success              | `auth.signin.success`         | `Signed in. Redirecting.`                                                                                 |
| Sign-up success              | `auth.signup.success`         | `Account created. Redirecting.`                                                                           |
| Reset success                | `auth.reset.success`          | `Password reset email sent. Check your inbox for the reset link.`                                         |
| Verification success         | `auth.verify.success`         | `Verification email sent.`                                                                                |
| Verification refresh success | `auth.verify.refreshSuccess`  | `Email verified. Redirecting.`                                                                            |
| Sign-out success             | `auth.signout.success`        | `Signed out.`                                                                                             |
| Mutation expiry              | `auth.sessionExpired.unsaved` | `Your session expired. Your change was not saved.`                                                        |

## 14. Data Visible to the User

| Entity               | User-visible attributes                                              | Surfaces                                                                  |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Session state        | signed in / signed out / expired                                     | landing, auth route, verification-required gate, protected shell          |
| Account              | email address, verification status                                   | auth route, verification banner, verification-required gate, account area |
| Recovery request     | reset-email send status                                              | reset form                                                                |
| Verification request | verification-email send status                                       | verification banner, verification-required gate                           |
| Redirect intent      | destination path is not displayed verbatim; only used for navigation | auth route internals, verification-required gate internals                |

Sensitive values such as ID tokens, passwords, and full backend error payloads must never be shown.

## 15. Validation and Error Handling

### Client-side validation rules

- Email fields trim leading and trailing whitespace on submit.
- Empty email shows: `Enter your email address.`
- Invalid email shows: `Enter a valid email address.`
- Empty password shows: `Enter your password.`
- Password shorter than 6 characters shows: `Password must be at least 6 characters.`
- Password longer than 128 characters shows: `Password must be 128 characters or fewer.`

### Backend-dependent errors that must map cleanly

| Condition                                  | User-facing message                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Invalid credentials                        | `Email or password is incorrect.`                                                                       |
| Existing account on sign-up                | `An account already exists for this email. Sign in instead.`                                            |
| Too many auth attempts                     | `Too many attempts. Wait a minute and try again.`                                                       |
| Unauthenticated protected read             | `Your session expired` alert plus redirect flow                                                         |
| Unauthenticated protected write            | `Session expired` dialog                                                                                |
| Verification required and still unverified | verification-required gate with preserved redirect intent                                               |
| Email-send failure                         | `We couldn't send the verification email. Try again.` or `We couldn't send the reset email. Try again.` |
| Generic server failure                     | `Something went wrong. Try again.`                                                                      |

### Failure-state behavior

- Field errors render inline beneath the relevant field and are linked with `aria-describedby`.
- Form-level errors render above the first field inside an alert region.
- Failed submissions preserve entered values except password fields may be retyped if the underlying provider clears them.

## 16. Accessibility Requirements

- Every form control has a visible label.
- The auth page uses a proper heading hierarchy with one `h1`-equivalent heading per mode.
- The mode switch must be keyboard-operable and visibly indicate the active mode.
- The session-expired dialog traps focus, closes on `Escape`, and returns focus on close.
- The verification reminder banner is announced only when it first appears, not on every rerender.
- The verification-required gate exposes resend, refresh, and sign-out actions without requiring pointer input.
- Icon-only controls are not required in this slice; if added later, they must include `aria-label`.
- Color alone must not indicate errors, success, or verification status; pair with text.
- Async status messages use a dedicated polite live region rather than changing heading text.

## 17. Responsive Behavior

- The public landing and auth page use a single-column layout below 768 px.
- The verification-required gate also uses a single-column layout below 768 px.
- At 768 px and above, the auth surface may center within a constrained content column but remains one primary form per view.
- Form controls span full available width on mobile.
- Inline supporting text wraps naturally and does not force horizontal scrolling.
- The session-expired dialog becomes a full-width bottom sheet or full-screen modal on narrow screens, while preserving the same copy, focus trap, and actions.

## 18. Open Questions

1. Should `/` remain a lightweight public landing in production, or should unauthenticated users be redirected directly to `/auth` once the board product is live?
2. Does the product want explicit terms/privacy routes before launch, or is the placeholder note acceptable until a later slice?

## 19. Acceptance Criteria

- An unauthenticated user can reach a clear entry surface and choose between sign-in and account creation.
- A returning user can sign in and lands on the intended protected route or `/boards` if no valid destination was preserved.
- A new user can create an account and, when `REQUIRE_EMAIL_VERIFICATION` is off, sees a non-blocking email verification reminder after entering the app.
- A new user can create an account and, when `REQUIRE_EMAIL_VERIFICATION` is on, is routed to the verification-required gate until verification completes.
- A user can request a password reset email from the auth route and receives a clear success or failure state.
- A signed-in user can sign out from the protected shell and returns to a signed-out landing state.
- When a protected read fails because the session expired, the user is redirected to sign in again with the destination preserved.
- When a protected write fails because the session expired, the user sees a blocking recovery dialog and the failed action is not silently lost.
- When verification is required and the user is still unverified, protected board content stays blocked and the original destination is preserved until verification succeeds.
- Every auth surface defines exact control labels, validation copy, loading behavior, keyboard behavior, focus behavior, and live announcements.

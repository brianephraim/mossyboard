# Wireframe Brief: Authentication and Session Boundaries

## 1. Source of Truth

This brief is derived from [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md) only. Do not change product behavior while designing wireframes.

## 2. Slice Objective

Visualize the Kanban app's authentication and session-boundary experience so a user can:

- enter from a public landing state
- sign in or create an account
- request a password reset
- understand email-verification status
- recover from session expiry without losing context

## 3. Scope for the Wireframe Agent

Include only auth and session-boundary surfaces in this brief.

Do not design:

- board list UI
- board detail UI
- card or column interactions
- profile settings
- social auth providers
- legal pages beyond placeholder links or note placement

When a protected area must appear for context, use a generic protected-shell stub rather than inventing board behavior.

## 4. Behavior Constraints to Preserve

- Public landing route: `/`
- Shared auth route: `/auth`
- Verification-required gate route: `/verify-email`
- Default protected destination after successful auth: `/boards`
- Auth modes: `signin`, `signup`, `reset`
- Email-verification behavior is environment-driven
- `REQUIRE_EMAIL_VERIFICATION=off`: unverified users can continue into protected content and see a reminder banner
- `REQUIRE_EMAIL_VERIFICATION=on`: unverified users are blocked at `/verify-email` until verified
- Session-expired recovery must preserve redirect intent and, when available, unsaved draft context
- Session-expired write failures use a blocking modal/dialog pattern

## 5. User Flows to Visualize

1. Unauthenticated landing to sign in
2. Unauthenticated landing to create account
3. Sign in with valid credentials
4. Sign in with invalid credentials
5. Create account with success path under both verification modes
6. Password reset request and success state
7. Protected-shell reminder path when verification is not required
8. Verification-required gate path when verification is required
9. Session-expired read redirect back to sign in
10. Session-expired write interruption via blocking dialog
11. Sign-out from a protected context

## 6. Screens to Design

### Required full wireframes

| ID  | Screen                                              | Why it needs a frame                           | Required variants                   |
| --- | --------------------------------------------------- | ---------------------------------------------- | ----------------------------------- |
| A1  | Public landing                                      | Entry point for signed-out users               | desktop default                     |
| A2  | Public landing                                      | Mobile behavior must be explicit               | mobile default                      |
| B1  | Auth page: sign in                                  | Primary returning-user path                    | default desktop                     |
| B2  | Auth page: sign in                                  | Session-expired read recovery is a key state   | session-expired alert               |
| B3  | Auth page: sign in                                  | Error handling should be visible               | invalid-credentials error           |
| C1  | Auth page: create account                           | Primary new-user path                          | default desktop                     |
| C2  | Auth page: create account                           | Account-creation errors should be visible      | email-in-use or weak-password error |
| D1  | Auth page: reset password                           | Recovery path needs its own layout             | default                             |
| D2  | Auth page: reset password                           | Success and cooldown behavior must be shown    | success plus cooldown               |
| E1  | Protected-shell stub with verification reminder     | Required when `REQUIRE_EMAIL_VERIFICATION=off` | desktop with banner visible         |
| E2  | Protected-shell stub with verification reminder     | Mobile banner behavior must be explicit        | mobile with banner visible          |
| F1  | Verification-required gate                          | Required when `REQUIRE_EMAIL_VERIFICATION=on`  | default desktop                     |
| F2  | Verification-required gate                          | Mobile action stacking must be explicit        | mobile default                      |
| G1  | Session-expired dialog over protected write surface | Key interruption state with focus trap         | default dialog                      |
| G2  | Session-expired dialog over protected write surface | Local-draft warning changes the content        | dialog with draft-restore warning   |

### States that may be annotation-only unless the layout changes materially

- sign-in pending state: `Signing in...`
- create-account success redirect note
- verification resend success on banner
- verification resend success on gate
- verification refresh error on gate
- sign-out pending state: `Signing out...`
- route-loading fallback on public landing

## 7. What Each Screen Must Show

### A. Public landing

- Heading: `Kanban for focused teams`
- Supporting text: `Sign in to access your boards, or create an account to get started.`
- Primary CTA: `Sign in`
- Secondary CTA: `Create account`
- Supporting note: `Email and password are the only sign-in method in this version.`

### B. Auth page shell

- One reusable auth layout that can host `signin`, `signup`, and `reset`
- Visible mode switch controls for `Sign in` and `Create account`
- Secondary navigation for `Forgot password?`, `Back to sign in`, and `Back to home`
- Clear alert region placement above form fields
- Dedicated place for inline status or live-region-associated feedback

### C. Sign-in form

- Heading: `Sign in`
- Email field
- Password field
- Submit button: `Sign in`
- Secondary links: `Forgot password?`, `Create account`, `Back to home`
- Session-expired alert variant with:
  - title `Your session expired`
  - body `Sign in again to continue where you left off.`

### D. Create-account form

- Heading: `Create account`
- Intro text: `Use your email and password to create a Kanban account.`
- Email field
- Password field
- Submit button: `Create account`
- Secondary link: `Sign in instead`
- Static terms/privacy placeholder note

### E. Reset-password form

- Heading: `Reset password`
- Body text: `Enter your email and we'll send a password reset link.`
- Email field
- Submit button: `Send reset email`
- Secondary link: `Back to sign in`
- Success state copy: `Password reset email sent. Check your inbox for the reset link.`
- Cooldown helper: `You can request another email in 30 seconds.`

### F. Protected-shell stub with verification reminder

- Minimal protected shell only
- Do not invent board contents beyond a neutral placeholder region labeled as protected content
- Reminder banner title: `Verify your email`
- Banner body: `Check your inbox to verify this account. You can keep using the app while verification is pending.`
- Banner actions: `Send verification email`, `Dismiss`
- Visible sign-out affordance somewhere in the stub shell

### G. Verification-required gate

- Heading: `Verify your email to continue`
- Body: `Check your inbox for a verification link. Once your email is verified, you can continue to your boards.`
- Signed-in email summary shown as read-only text
- Primary action: `Send verification email`
- Secondary action: `Refresh status`
- Tertiary action: `Sign out`
- Helper text: `You can keep this page open while you verify your email.`

### H. Session-expired dialog

- Dialog title: `Session expired`
- Dialog body: `Your change was not saved because your session expired. Sign in again to continue.`
- Optional warning variant: `We couldn't save your unsaved changes locally. You can still sign in again.`
- Primary action: `Sign in again`
- Secondary action: `Cancel`
- Show the dialog over a generic protected-write surface stub

## 8. Annotations to Show on the Wireframes

- Exact route or state label on every frame
- Whether the frame is for `REQUIRE_EMAIL_VERIFICATION=off` or `REQUIRE_EMAIL_VERIFICATION=on`
- Primary user intent for the frame
- Initial focus target
- Keyboard path when it matters
- Live-region announcements for async outcomes
- Disabled or cooldown state labels where relevant
- Redirect destination notes where success does not stay on the same screen
- Which elements are generic protected-shell placeholders rather than defined board UI

## 9. Interaction Notes

- The auth route is one shared page with mode switching, not three unrelated screens.
- The wireframes may explore how the mode switch looks, but it must stay clearly keyboard-operable.
- Successful sign-in and account creation redirect away from the auth page.
- Redirect target depends on verification state and `REQUIRE_EMAIL_VERIFICATION`.
- When verification is not required, the reminder appears inside the protected shell and can be dismissed for the current session only.
- When verification is required, the gate is the only in-app destination available after auth until verification succeeds.
- The session-expired dialog is for protected write failures only. It is not used for ordinary sign-in errors.
- After session-expired read failures, the auth page must show the top-of-page expired-session alert.
- Sign-out needs to be visible in protected contexts, but its final placement inside the future board shell is still open for design exploration.

## 10. Responsive Notes

- Below 768 px, landing, auth, and verification-gate layouts are single-column.
- Landing CTAs stack vertically on mobile.
- Form controls use full available width on mobile.
- Verification-gate actions stack vertically on mobile.
- The session-expired dialog becomes a full-width bottom sheet or full-screen modal on narrow screens.
- Do not introduce horizontal scrolling for helper text, banners, or signed-in email text.

## 11. Accessibility Callouts

- Every control shown in the wireframes must be reachable by keyboard alone.
- Show visible labels for all form fields.
- Show where inline field errors and form-level alerts appear.
- The session-expired dialog must trap focus, close on `Escape`, and return focus on close.
- The verification reminder banner must not trap focus.
- The verification-required gate must support resend, refresh, and sign-out without pointer-only interactions.
- Async statuses should be annotated as live-region announcements rather than only visual state changes.
- Do not use color alone to distinguish verification, success, or error states.

## 12. Visual and Tone Guidance

- Keep the tone calm, clear, and task-focused rather than marketing-heavy.
- Use sentence case throughout.
- Prefer simple, legible auth layouts over ornamental complexity.
- If illustration or iconography is explored, it must stay secondary to the form content and status messages.
- Use a lightweight protected-shell stub so the wireframes do not accidentally define the board UI too early.

## 13. Items Intentionally Left Open for Design Exploration

- Visual treatment of the auth mode switch: segmented control, tabs, or another clearly accessible pattern
- Whether the public landing includes a lightweight illustration, a text-only hero, or simple product iconography
- Exact visual placement of the reminder banner inside the future protected shell
- Exact treatment of the sign-out affordance in protected contexts while the board shell remains unspecified
- How prominent the signed-in email summary should be on the verification-required gate

## 14. Open Design Questions

1. Should the public landing feel more like a minimal utility page or a slightly more expressive product introduction?
2. Should the auth mode switch read more like tabs or more like stacked actions for better small-screen clarity?
3. Where should the verification reminder banner sit within the future protected shell: top-of-page, under the nav, or inline near the main content start?
4. Should the verification-required gate use lightweight explanatory illustration, or stay entirely text-first?

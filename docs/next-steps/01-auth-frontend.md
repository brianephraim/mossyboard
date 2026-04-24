## Session 01: Auth Frontend

### Session goal

Replace the current debug-style auth page with the full Tamagui-based auth/session flow described in the auth UX spec. After this session a user can sign in, sign up, reset a password, handle verification, and land back on `/boards` without the frontend inventing behavior.

### Pre-read

- [`docs/ux-specs/auth-session-boundaries.md`](../ux-specs/auth-session-boundaries.md)
- [`docs/ux-specs/auth-session-boundaries-frontend-build-brief.md`](../ux-specs/auth-session-boundaries-frontend-build-brief.md)
- [`docs/ux-specs/auth-session-boundaries-wireframe-brief.md`](../ux-specs/auth-session-boundaries-wireframe-brief.md)
- [`docs/ux-specs/auth-session-boundaries-frontend-dependency-exploration.md`](../ux-specs/auth-session-boundaries-frontend-dependency-exploration.md)
- [`docs/frontend-library-decisions.md`](../frontend-library-decisions.md)
- [`AGENTS.md`](../../AGENTS.md) — Tamagui, accessibility, and modal rules
- Existing code to replace or integrate with:
  - [`src/routes/auth.tsx`](../../src/routes/auth.tsx) (scaffold to replace)
  - [`src/routes/verify-email.tsx`](../../src/routes/verify-email.tsx)
  - [`src/routes/__root.tsx`](../../src/routes/__root.tsx)
  - [`src/features/auth/`](../../src/features/auth) — existing auth client modules
  - [`src/Modal/PrettyModalWrap.tsx`](../../src/Modal/PrettyModalWrap.tsx)

### Preconditions

- Auth backend (phases 6–7) is implemented and passing.
- `VITE_PUBLIC_FIREBASE_*` env values are present.
- `AGENT_LOGIN_EMAIL` / `AGENT_LOGIN_PASSWORD` are available if you want to smoke-test sign-in locally.
- Working tree is clean.

### Checklist

#### Shell and routing

- [ ] Implement `PublicAuthLanding` on `/` with signed-out heading, CTAs, and an authenticated-redirect guard
- [ ] Implement `AuthPageShell` at `/auth` with top alert region, mode switch region, form region, and live-region anchor
- [ ] Implement `AuthModeSwitch` using `@tamagui/tabs`, URL-driven (`?mode=signin|signup|reset`)
- [ ] Implement `/verify-email` as `VerifyEmailGate` for verification-required case

#### Forms

- [ ] Implement `SignInForm` with `react-hook-form`, field validation, session-expired alert support
- [ ] Implement `SignUpForm` with `react-hook-form`, duplicate-account and weak-password error mapping, verification-branching redirect
- [ ] Implement `ResetPasswordForm` with `react-hook-form`, success and cooldown states, back-to-sign-in nav

#### Session integration

- [ ] Implement `VerificationReminderBanner` for the `REQUIRE_EMAIL_VERIFICATION=off` path, with resend and dismiss-for-session
- [ ] Implement `AccountSignOutControl` reusable across protected shell and `/verify-email`
- [ ] Implement `SessionExpiredDialog` using `PrettyModalWrap`; open on protected write auth failures, support `Sign in again` and `Cancel`
- [ ] Implement `AuthLiveRegion` as a single polite live region for async announcements

#### Redirect handling

- [ ] Preserve a safe `redirectTo` through sign-in / sign-up
- [ ] Normalize unsafe or self-referential `redirectTo` values back to `/boards`
- [ ] After successful sign-in redirect to the preserved target, defaulting to `/boards`

#### Accessibility and responsiveness

- [ ] Every control reachable and operable by keyboard alone
- [ ] Field errors associated via `aria-describedby`
- [ ] On validation failure, focus moves to first invalid field; on form-level failure, to the alert region
- [ ] Single-column layout below 768 px; `SessionExpiredDialog` becomes a bottom sheet or full-screen modal on narrow screens
- [ ] Color is never the only signal for success, error, or verification state

### Verification

- `npm run test`
- `npm run build`
- `npx prettier --write` on every file touched
- Manual browser pass (use `AGENT_LOGIN_EMAIL` / `AGENT_LOGIN_PASSWORD` if available):
  - sign in → lands on `/boards`
  - sign up → respects `REQUIRE_EMAIL_VERIFICATION`
  - reset → success state + cooldown visible
  - signed-in `/` visit redirects away from landing
  - protected read with expired token redirects to sign-in with session-expired alert
  - protected write with expired token opens `SessionExpiredDialog`

### Commit points

1. Shell + routing skeleton in place (no forms wired yet): `feat: scaffold auth shell, mode switch, and verify-email gate`
2. Each form landing individually, e.g.:
   - `feat: implement auth sign-in form`
   - `feat: implement auth sign-up form`
   - `feat: implement auth password-reset form`
3. Session integration pieces:
   - `feat: add verification reminder banner and live region`
   - `feat: add session-expired dialog via PrettyModalWrap`
4. Final polish and a11y pass: `refactor: tighten auth a11y and responsive behavior`

Do not batch all work into one commit. Each commit must leave the tree building and tests green.

### Out of scope

- Board-shell visual system (do not let auth define it)
- Redux for auth form state
- Any auth screens beyond `/`, `/auth`, `/verify-email`
- Changes to backend auth behavior

### Definition of done

Auth flows match the canonical UX spec, all auth checkboxes in the frontend checklist reflect that reality, `npm run test` and `npm run build` pass, and the browser walkthrough above completes without invented behavior.

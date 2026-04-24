# Backend Build Brief: Authentication and Session Boundaries

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md)

This brief derives backend responsibilities only from the UX defined there. Do not add server capabilities the UX does not require.

## 2. Slice Goal

Support the auth/session UX with behaviorally correct server-side enforcement and auth-email delivery, while keeping identity, ownership, and error handling consistent with project rules.

## 3. Entities and Context Involved

### External identity entity

- Firebase auth user
- required attributes implied by the UX:
  - Firebase UID
  - email
  - email verification status

### Server request context

- `ctx.userId` for authenticated procedures
- request identity metadata sufficient for logging
- verification status or equivalent auth claim information sufficient to enforce `REQUIRE_EMAIL_VERIFICATION` when needed

### No new application tables required by this slice

- This slice does not require a new `public` table.
- If implementation later introduces a persistence table anyway, the same migration must include RLS enablement and explicit policies.

## 4. Required Read Operations

- verify whether a protected procedure call is authenticated
- determine whether the current authenticated user is email-verified when enforcement is enabled
- support protected reads failing in a way the frontend can map to the session-expired sign-in redirect

The UX does not require a standalone application read endpoint for auth profile data beyond what existing auth/session mechanisms already expose.

## 5. Required Write Operations

- sign-in and sign-up are handled through Firebase auth flows rather than a custom app-owned user table write
- send verification email through the server-side auth email path
- send password reset email through the server-side auth email path
- support sign-out as a client auth action without requiring a custom backend mutation

## 6. Validation Rules

- every tRPC procedure must declare a zod `.input(...)` schema
- password-reset email send requires a validated email input
- verification-email send must validate authenticated caller context
- no procedure should accept unvalidated auth-email payloads from the client
- redirect routing values remain a frontend concern; the backend should not trust arbitrary client redirect strings for privileged auth-email generation without validation inside the existing auth-email module

## 7. Ownership and Permission Checks

- protected procedures continue to require verified Firebase identity via `protectedProcedure`
- when `REQUIRE_EMAIL_VERIFICATION` is off:
  - authenticated but unverified users may continue to protected board reads and writes
- when `REQUIRE_EMAIL_VERIFICATION` is on:
  - protected board reads and writes must reject authenticated but unverified users consistently
  - the frontend will map that rejection into the `/verify-email` gate
- auth-email resend operations must only act on the authenticated caller's email identity
- no endpoint in this slice may allow one user to trigger verification or recovery flow for another authenticated user by passing arbitrary identity fields

## 8. Concurrency-Sensitive Flows

This slice has minimal data-concurrency requirements because it does not reorder or mutate owned application records directly.

The UX still depends on consistent handling for:

- expired token on protected read
- expired token on protected write
- verification status changing between auth steps

Backend implication:

- auth failure responses must be stable enough that the frontend can distinguish:
  - unauthenticated or expired session
  - authenticated but verification-blocked when enforcement is on

## 9. Error Conditions the UI Depends On

The frontend UX requires backend errors to map cleanly into these visible states:

- unauthenticated protected read
  - frontend action: redirect to sign-in with session-expired alert
- unauthenticated protected write
  - frontend action: show blocking session-expired dialog
- verification required and still unverified
  - frontend action: route to `/verify-email`
- verification email send failure
  - frontend action: show retry-capable error on the banner or gate
- password reset email send failure
  - frontend action: show retry-capable form error

All server-side failures must use `TRPCError` with documented codes rather than custom error shapes.

## 10. Logging Expectations

- log request or procedure outcome with `requestId`, `path`, `type`, duration, `ok`, and `userId` when available
- never log:
  - passwords
  - ID tokens
  - raw auth-email links in user-visible contexts
  - full payload bodies containing sensitive values
- email-delivery failures may log provider-safe metadata, but not secret tokens or full sensitive payloads

## 11. Required Environment and Enforcement Contract

- `FIREBASE_SERVICE_ACCOUNT_JSON` remains required for privileged auth verification and link generation
- auth-email delivery continues to depend on the existing mail configuration
- email-verification enforcement must be driven by `REQUIRE_EMAIL_VERIFICATION`
- the server remains the source of truth for verification enforcement, even if the frontend mirrors the flag for earlier branching

## 12. Backend Acceptance Criteria

- Protected procedures reject missing or invalid Firebase auth consistently.
- Protected procedures can distinguish authenticated-but-unverified access when `REQUIRE_EMAIL_VERIFICATION` is enabled.
- Verification email resend works only for the authenticated caller context.
- Password reset email send validates input and returns a consistent success or error envelope.
- The frontend can reliably map backend auth failures into:
  - sign-in redirect for expired reads
  - blocking dialog for expired writes
  - verification-required gate for unverified-but-authenticated users when enforcement is on
- No new persistence surface is introduced without following the repo's RLS and migration rules.

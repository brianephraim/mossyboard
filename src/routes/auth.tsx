import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import {
  parseAuthMode,
  parseSafeRedirectTo,
  parseSessionExpiredReason,
} from "../auth/searchParams";
import { useAuthSession, useRequiresEmailVerification } from "../auth/session";
import { AuthFormsPlaceholder } from "../features/auth/AuthFormsPlaceholder";
import { AuthPageShell } from "../features/auth/AuthPageShell";
import { SignInForm } from "../features/auth/SignInForm";
import { SignUpForm } from "../features/auth/SignUpForm";

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => ({
    mode: parseAuthMode(search.mode),
    redirectTo: parseSafeRedirectTo(search.redirectTo, search.redirect),
    reason: typeof search.reason === "string" ? search.reason : undefined,
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const navigate = useNavigate({ from: "/auth" });
  const search = Route.useSearch();
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const sessionExpired = parseSessionExpiredReason(search.reason);
  const alertRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!sessionExpired) {
      return;
    }

    alertRef.current?.focus();
  }, [sessionExpired]);

  useEffect(() => {
    if (!session.hasResolvedInitialAuth || !session.isSignedIn) {
      return;
    }

    const redirectTarget = search.redirectTo;
    const target =
      requiresEmailVerification && !session.user?.emailVerified ? "/verify-email" : redirectTarget;

    void navigate({
      to: target,
      search: target === "/verify-email" ? { redirectTo: redirectTarget } : {},
      replace: true,
    });
  }, [
    navigate,
    requiresEmailVerification,
    search.redirectTo,
    session.hasResolvedInitialAuth,
    session.isSignedIn,
    session.user,
  ]);

  const form =
    search.mode === "signin" ? (
      <SignInForm redirectTo={search.redirectTo} formHeadingRef={headingRef} />
    ) : search.mode === "signup" ? (
      <SignUpForm redirectTo={search.redirectTo} formHeadingRef={headingRef} />
    ) : (
      <AuthFormsPlaceholder mode={search.mode} />
    );

  return (
    <AuthPageShell
      mode={search.mode}
      redirectTo={search.redirectTo}
      sessionExpired={sessionExpired}
      alertRegionRef={alertRef}
      formHeadingRef={headingRef}
    >
      {form}
    </AuthPageShell>
  );
}

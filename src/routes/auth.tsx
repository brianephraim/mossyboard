import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { getUser, signInWithEmail, signOutUser, signUpWithEmail } from "../auth/client";
import { useAuthSession, useRequiresEmailVerification } from "../auth/session";
import { trpc } from "../trpc/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate({ from: "/auth" });
  const search = Route.useSearch();
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const user = getUser();
  const redirectTarget =
    search.redirect && search.redirect.startsWith("/") ? search.redirect : "/boards";

  const protectedEcho = trpc.protectedEcho.useQuery(
    { message: "hello" },
    { enabled: false, retry: false },
  );

  const sendVerification = trpc.authEmail.sendVerification.useMutation({
    retry: false,
    onSuccess: () => setStatus("verification email sent"),
    onError: (err) => setStatus(`verification email failed: ${err.message}`),
  });

  const sendPasswordReset = trpc.authEmail.sendPasswordReset.useMutation({
    retry: false,
    onSuccess: () => setStatus("password reset email sent"),
    onError: (err) => setStatus(`password reset email failed: ${err.message}`),
  });

  useEffect(() => {
    if (!session.hasResolvedInitialAuth || !session.isSignedIn) {
      return;
    }

    const target =
      requiresEmailVerification && !session.user?.emailVerified ? "/verify-email" : redirectTarget;

    void navigate({
      to: target,
      search: target === "/verify-email" ? { redirect: redirectTarget } : {},
      replace: true,
    });
  }, [
    navigate,
    redirectTarget,
    requiresEmailVerification,
    session.hasResolvedInitialAuth,
    session.isSignedIn,
    session.user,
  ]);

  return (
    <main>
      <h1>Auth</h1>
      <div>Redirect target: {redirectTarget}</div>
      <div>Signed in: {user ? "yes" : "no"}</div>
      {user ? <div>User: {user.email ?? user.uid}</div> : null}

      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
        />
      </label>

      <div>
        <button
          type="button"
          onClick={async () => {
            setStatus(null);
            await signUpWithEmail({ email, password });
            setStatus("signed up");
            void navigate({
              to:
                requiresEmailVerification && !getUser()?.emailVerified
                  ? "/verify-email"
                  : redirectTarget,
              search:
                requiresEmailVerification && !getUser()?.emailVerified
                  ? { redirect: redirectTarget }
                  : {},
            });
          }}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={async () => {
            setStatus(null);
            await signInWithEmail({ email, password });
            setStatus("signed in");
            void navigate({
              to:
                requiresEmailVerification && !getUser()?.emailVerified
                  ? "/verify-email"
                  : redirectTarget,
              search:
                requiresEmailVerification && !getUser()?.emailVerified
                  ? { redirect: redirectTarget }
                  : {},
            });
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={async () => {
            setStatus(null);
            await signOutUser();
            setStatus("signed out");
          }}
        >
          Sign out
        </button>
      </div>

      <div>
        <button type="button" onClick={() => protectedEcho.refetch()}>
          Call protected tRPC
        </button>
        {protectedEcho.isFetching ? <div>Calling…</div> : null}
        {protectedEcho.data ? <div>OK: {protectedEcho.data.userId}</div> : null}
        {protectedEcho.error ? <div>Error: {protectedEcho.error.message}</div> : null}
      </div>

      <div>
        <button
          type="button"
          disabled={sendVerification.isPending || !user}
          onClick={async () => {
            setStatus(null);
            await sendVerification.mutateAsync({});
          }}
        >
          Send verification email
        </button>
        <button
          type="button"
          disabled={sendPasswordReset.isPending || !email}
          onClick={async () => {
            setStatus(null);
            await sendPasswordReset.mutateAsync({ email });
          }}
        >
          Send password reset email
        </button>
      </div>

      {status ? <div aria-live="polite">{status}</div> : null}
    </main>
  );
}

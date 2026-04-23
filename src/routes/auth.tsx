import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { getUser, signInWithEmail, signOutUser, signUpWithEmail } from "../auth/client";
import { trpc } from "../trpc/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const user = getUser();

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

  return (
    <main>
      <h1>Auth</h1>
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

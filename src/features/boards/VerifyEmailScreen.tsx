import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { signOutUser } from "../../auth/client";
import {
  refreshAuthSession,
  useAuthSession,
  useRequiresEmailVerification,
} from "../../auth/session";
import { trpc } from "../../trpc/client";
import { BoardActionButton, BoardInlineNotice } from "./ui";
import { CenteredBoardState } from "./access";

export function VerifyEmailScreen({
  redirectTo,
}: Readonly<{
  redirectTo?: string;
}>) {
  const navigate = useNavigate();
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const [status, setStatus] = useState<string | null>(null);
  const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/boards";

  const sendVerification = trpc.authEmail.sendVerification.useMutation({
    onSuccess: () => {
      setStatus("Verification email sent.");
    },
    onError: () => {
      setStatus("Could not send verification email.");
    },
  });

  useEffect(() => {
    if (!session.hasResolvedInitialAuth) {
      return;
    }

    if (!session.isSignedIn) {
      void navigate({
        to: "/auth",
        search: { mode: "signin", redirectTo: target },
        replace: true,
      });
      return;
    }

    if (!requiresEmailVerification || session.user?.emailVerified) {
      void navigate({
        to: target,
        replace: true,
      });
    }
  }, [
    navigate,
    requiresEmailVerification,
    session.hasResolvedInitialAuth,
    session.isSignedIn,
    session.user,
    target,
  ]);

  if (!session.hasResolvedInitialAuth) {
    return (
      <CenteredBoardState
        title="Checking verification status"
        description="We’re confirming whether this environment still requires a verified email."
      />
    );
  }

  if (!session.isSignedIn) {
    return (
      <CenteredBoardState
        title="Redirecting to sign in"
        description="Email verification only applies to authenticated sessions."
      />
    );
  }

  if (!requiresEmailVerification || session.user?.emailVerified) {
    return (
      <CenteredBoardState
        title="Opening your board"
        description="Your account is ready, so we’re taking you back into the protected workspace."
      />
    );
  }

  return (
    <CenteredBoardState
      title="Verify your email to enter the board"
      description="This environment requires email verification before loading protected board content. Once you verify, refresh this screen and we’ll continue."
      actions={
        <>
          <BoardActionButton
            tone="accent"
            disabled={sendVerification.isPending}
            onPress={() => {
              void sendVerification.mutateAsync({});
            }}
          >
            {sendVerification.isPending ? "Sending…" : "Send verification email"}
          </BoardActionButton>
          <BoardActionButton
            onPress={() => {
              void refreshAuthSession().then(() => {
                setStatus("Verification status refreshed.");
              });
            }}
          >
            Refresh status
          </BoardActionButton>
          <BoardActionButton
            tone="ghost"
            onPress={() => {
              void signOutUser().then(() => {
                void navigate({ to: "/auth", replace: true });
              });
            }}
          >
            Sign out
          </BoardActionButton>
        </>
      }
    >
      {status ? <BoardInlineNotice tone="success" message={status} /> : null}
    </CenteredBoardState>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import {
  refreshAuthSession,
  useAuthSession,
  useRequiresEmailVerification,
} from "../../auth/session";
import { AccountSignOutControl } from "../../features/auth/AccountSignOutControl";
import { useAuthAnnounceOptional } from "../../features/auth/AuthAnnounceContext";
import { trpc } from "../../trpc/client";
import { BoardActionButton, BoardInlineNotice } from "./ui";
import { CenteredBoardState } from "./access";

export function VerifyEmailScreen({
  redirectTo,
}: Readonly<{
  redirectTo?: string;
}>) {
  const navigate = useNavigate();
  const announce = useAuthAnnounceOptional();
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const [status, setStatus] = useState<string | null>(null);
  const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/boards";

  const sendVerification = trpc.authEmail.sendVerification.useMutation({
    onSuccess: () => {
      setStatus("Verification email sent. Check your inbox for the link.");
      announce?.announce("Verification email sent.");
    },
    onError: () => {
      setStatus("We couldn't send the verification email. Try again.");
      announce?.announce("We couldn't send the verification email. Try again.");
    },
  });

  useEffect(() => {
    if (!session.hasResolvedInitialAuth) {
      return;
    }

    if (!session.isSignedIn) {
      void navigate({
        to: "/auth",
        search: { mode: "signin", redirectTo: target, reason: undefined },
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
      title="Verify your email to enter Mossyboard"
      description="Check your inbox for a verification link. Once you confirm your address, we'll bring you back to your boards."
      actions={
        <>
          <BoardActionButton
            tone="accent"
            alignSelf="center"
            disabled={sendVerification.isPending}
            onPress={() => {
              void sendVerification.mutateAsync({});
            }}
          >
            {sendVerification.isPending ? "Sending..." : "Send verification email"}
          </BoardActionButton>
          <BoardActionButton
            onPress={() => {
              void refreshAuthSession().then((user) => {
                if (user?.emailVerified) {
                  setStatus("Email verified. Redirecting.");
                  announce?.announce("Email verified. Redirecting.");
                } else {
                  setStatus("We couldn't confirm your verification status. Try again.");
                  announce?.announce("We couldn't confirm your verification status. Try again.");
                }
              });
            }}
          >
            Refresh status
          </BoardActionButton>
          <AccountSignOutControl />
        </>
      }
    >
      <YStack gap="$3" width="100%">
        <XStack gap="$2" flexWrap="wrap" alignItems="center">
          <Text color="$boardTextMuted">Signed in as</Text>
          <Text fontWeight="700" color="$boardHeading">
            {session.user?.email ?? "this account"}
          </Text>
        </XStack>
        <Text color="$boardTextMuted">
          Open the verification email, confirm your address, then return here and refresh your
          status.
        </Text>
        <Text color="$boardTextMuted">
          You can keep this page open while you verify your email in another tab.
        </Text>
        {status ? (
          <BoardInlineNotice
            tone={
              status.includes("couldn't") || status.includes("Could not") ? "danger" : "success"
            }
            message={status}
          />
        ) : null}
      </YStack>
    </CenteredBoardState>
  );
}

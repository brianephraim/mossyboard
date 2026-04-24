import { useCallback, useEffect, useState } from "react";

import { refreshAuthSession } from "../../auth/session";
import { trpc } from "../../trpc/client";
import { BoardActionButton, BoardInlineNotice } from "../boards/ui";
import { useAuthAnnounceOptional } from "./AuthAnnounceContext";

const DISMISS_KEY = "kanban_verification_reminder_dismissed";

type VerificationReminderBannerProps = Readonly<{
  userEmail: string | null | undefined;
}>;

export function VerificationReminderBanner({ userEmail }: VerificationReminderBannerProps) {
  const announce = useAuthAnnounceOptional();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  });
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const id = window.setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [cooldown]);

  const sendVerification = trpc.authEmail.sendVerification.useMutation({
    retry: false,
    onSuccess: () => {
      announce?.announce("Verification email sent.");
      setCooldown(30);
    },
    onError: () => {
      announce?.announce("We couldn't send the verification email. Try again.");
    },
  });

  const onDismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    }

    setDismissed(true);
  }, []);

  if (dismissed) {
    return null;
  }

  const message = `Verify your email. Check your inbox to verify this account (${userEmail ?? "your account"}). You can keep using the app while verification is pending.`;

  return (
    <BoardInlineNotice
      tone="warning"
      message={message}
      actions={
        <>
          <BoardActionButton
            tone="ghost"
            disabled={sendVerification.isPending || cooldown > 0}
            onPress={() => {
              void sendVerification.mutateAsync({});
            }}
          >
            {sendVerification.isPending
              ? "Sending…"
              : cooldown > 0
                ? `Send verification email (${cooldown}s)`
                : "Send verification email"}
          </BoardActionButton>
          <BoardActionButton
            tone="ghost"
            onPress={() => {
              void refreshAuthSession().then(() => {
                announce?.announce("Verification status refreshed.");
              });
            }}
          >
            Refresh status
          </BoardActionButton>
          <BoardActionButton tone="ghost" onPress={onDismiss}>
            Dismiss
          </BoardActionButton>
        </>
      }
    />
  );
}

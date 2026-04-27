import { useEffect, useMemo, useState } from "react";

import { YStack } from "@tamagui/stacks";

import { trpc } from "../../trpc/client";
import { BoardActionButton, BoardInlineNotice } from "../boards/ui";
import { useAuthAnnounceOptional } from "./AuthAnnounceContext";

type VerificationSidebarCalloutProps = Readonly<{
  userEmail: string | null | undefined;
}>;

export function VerificationSidebarCallout({ userEmail }: VerificationSidebarCalloutProps) {
  const announce = useAuthAnnounceOptional();
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

  const message = useMemo(() => {
    if (!userEmail) {
      return "Verification pending. Please check your inbox to verify your email.";
    }

    return `Verification pending for ${userEmail}. Check your inbox to verify.`;
  }, [userEmail]);

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

  return (
    <BoardInlineNotice
      tone="warning"
      message={message}
      actions={
        <YStack width="100%" alignItems="center" paddingHorizontal="$1">
          <BoardActionButton
            tone="ghost"
            alignSelf="center"
            maxWidth="100%"
            borderWidth={0}
            backgroundColor="transparent"
            paddingHorizontal="$0"
            paddingVertical="$0"
            minHeight={0}
            height="auto"
            hoverStyle={{ backgroundColor: "transparent", opacity: 0.8 }}
            pressStyle={{ backgroundColor: "transparent", opacity: 0.7 }}
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
        </YStack>
      }
    />
  );
}

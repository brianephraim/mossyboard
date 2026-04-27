import type { ComponentProps } from "react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import { signOutUser } from "../../auth/client";
import { BoardActionButton } from "../boards/ui";

type AccountSignOutControlProps = Readonly<{
  /** Called after successful sign-out, before navigation. */
  onSignedOut?: () => void;
  /** Where to send the user after sign-out. Defaults to `/` per auth UX spec. */
  afterSignOutTo?: "/" | "/auth";
  /** Optional presentation overrides for contexts like the board sidebar rail. */
  buttonTone?: ComponentProps<typeof BoardActionButton>["tone"];
  buttonProps?: Omit<ComponentProps<typeof BoardActionButton>, "children" | "onPress" | "tone">;
  errorColor?: ComponentProps<typeof Text>["color"];
}>;

export function AccountSignOutControl({
  onSignedOut,
  afterSignOutTo = "/",
  buttonTone = "ghost",
  buttonProps,
  errorColor = "$red10",
}: AccountSignOutControlProps) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <YStack gap="$2" alignItems="flex-start">
      <BoardActionButton
        tone={buttonTone}
        {...buttonProps}
        disabled={signingOut || buttonProps?.disabled}
        onPress={() => {
          setError(null);
          setSigningOut(true);
          void signOutUser()
            .then(() => {
              onSignedOut?.();
              void navigate(
                afterSignOutTo === "/auth"
                  ? {
                      to: "/auth",
                      search: { mode: "signin", redirectTo: "/boards", reason: undefined },
                      replace: true,
                    }
                  : { to: "/", search: { redirectTo: undefined }, replace: true },
              );
            })
            .catch(() => {
              setError("Sign out failed. Try again.");
            })
            .finally(() => {
              setSigningOut(false);
            });
        }}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </BoardActionButton>
      {error ? (
        <Text role="alert" color={errorColor}>
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}

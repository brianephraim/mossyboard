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
}>;

export function AccountSignOutControl({
  onSignedOut,
  afterSignOutTo = "/",
}: AccountSignOutControlProps) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <YStack gap="$2" alignItems="flex-start">
      <BoardActionButton
        tone="ghost"
        disabled={signingOut}
        onPress={() => {
          setError(null);
          setSigningOut(true);
          void signOutUser()
            .then(() => {
              onSignedOut?.();
              void navigate({ to: afterSignOutTo, search: {} });
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
        <Text role="alert" color="$red10">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}

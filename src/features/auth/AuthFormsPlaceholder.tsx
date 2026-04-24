import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import type { AuthMode } from "../../auth/searchParams";

export function AuthFormsPlaceholder({ mode }: Readonly<{ mode: AuthMode }>) {
  return (
    <YStack gap="$2" paddingVertical="$2">
      <Text color="$color11">
        {mode === "reset"
          ? "Password reset form loads here."
          : mode === "signup"
            ? "Create account form loads here."
            : "Sign-in form loads here."}
      </Text>
    </YStack>
  );
}

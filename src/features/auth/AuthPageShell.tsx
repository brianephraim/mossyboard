import type { ReactNode, RefObject } from "react";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";
import { useNavigate } from "@tanstack/react-router";

import type { AuthMode } from "../../auth/searchParams";
import { AuthModeSwitch } from "./AuthModeSwitch";

type AuthPageShellProps = Readonly<{
  mode: AuthMode;
  redirectTo: string;
  sessionExpired: boolean;
  alertRegionRef: RefObject<HTMLElement | null>;
  formHeadingRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}>;

export function AuthPageShell({
  mode,
  redirectTo,
  sessionExpired,
  alertRegionRef,
  formHeadingRef,
  children,
}: AuthPageShellProps) {
  const navigate = useNavigate();

  return (
    <YStack
      tag="main"
      minHeight="100vh"
      padding="$5"
      $sm={{ paddingHorizontal: "$4" }}
      backgroundColor="$background"
      alignItems="center"
      gap="$5"
    >
      <YStack width="100%" maxWidth={480} $sm={{ maxWidth: "100%" }} gap="$5">
        <Text tag="h1" fontSize="$9" fontWeight="800" color="$color12">
          Kanban access
        </Text>

        <YStack
          ref={alertRegionRef as RefObject<HTMLDivElement>}
          tabIndex={-1}
          gap="$2"
          borderWidth={sessionExpired ? 1 : 0}
          borderColor="$yellow10"
          backgroundColor={sessionExpired ? "$yellow2" : "transparent"}
          padding={sessionExpired ? "$3" : 0}
          borderRadius="$4"
          display={sessionExpired ? "flex" : "none"}
        >
          <Text tag="h2" fontSize="$5" fontWeight="800" color="$color12">
            Your session expired
          </Text>
          <Text color="$color11">Sign in again to continue where you left off.</Text>
        </YStack>

        <AuthModeSwitch mode={mode} redirectTo={redirectTo} formHeadingRef={formHeadingRef} />

        <YStack gap="$4">{children}</YStack>

        <Button
          chromeless
          alignSelf="flex-start"
          paddingHorizontal={0}
          height="auto"
          onPress={() => {
            void navigate({ to: "/", search: {} });
          }}
        >
          <Text color="$blue10" textDecorationLine="underline">
            Back to home
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
}

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { Tabs } from "@tamagui/tabs";
import { YStack } from "@tamagui/stacks";

import type { AuthMode } from "../../auth/searchParams";

type AuthModeSwitchProps = Readonly<{
  mode: AuthMode;
  redirectTo: string;
  formHeadingRef: RefObject<HTMLElement | null>;
  onModeChange?: (next: "signin" | "signup") => void;
}>;

export function AuthModeSwitch({
  mode,
  redirectTo,
  formHeadingRef,
  onModeChange,
}: AuthModeSwitchProps) {
  const navigate = useNavigate({ from: "/auth" });
  const prevMode = useRef(mode);

  useEffect(() => {
    if (mode === "reset" || prevMode.current === mode) {
      prevMode.current = mode;
      return;
    }

    if (mode === "signin" || mode === "signup") {
      formHeadingRef.current?.focus();
      onModeChange?.(mode);
    }

    prevMode.current = mode;
  }, [formHeadingRef, mode, onModeChange]);

  if (mode === "reset") {
    return (
      <YStack gap="$2" width="100%">
        <Text fontSize="$3" fontWeight="600" color="$color11">
          Password reset
        </Text>
        <Button
          chromeless
          alignSelf="flex-start"
          paddingHorizontal={0}
          height="auto"
          onPress={() => {
            void navigate({
              to: "/auth",
              search: { mode: "signin", redirectTo, reason: undefined },
              replace: true,
            });
          }}
        >
          <Text color="$blue10" textDecorationLine="underline">
            Back to sign in
          </Text>
        </Button>
      </YStack>
    );
  }

  const tabValue = mode === "signup" ? "signup" : "signin";

  return (
    <Tabs
      value={tabValue}
      onValueChange={(next) => {
        if (next !== "signin" && next !== "signup") {
          return;
        }

        void navigate({
          to: "/auth",
          search: { mode: next, redirectTo, reason: undefined },
          replace: true,
        });
      }}
      orientation="horizontal"
      activationMode="manual"
      width="100%"
    >
      <Tabs.List loop={false} gap="$2" backgroundColor="transparent" borderWidth={0} padding={0}>
        <Tabs.Tab
          value="signin"
          flex={1}
          borderRadius="$6"
          borderWidth={1}
          borderColor={tabValue === "signin" ? "$borderColorFocus" : "$borderColor"}
          backgroundColor={tabValue === "signin" ? "$backgroundFocus" : "$background"}
        >
          <Text fontWeight="700" color="$color12">
            Sign in
          </Text>
        </Tabs.Tab>
        <Tabs.Tab
          value="signup"
          flex={1}
          borderRadius="$6"
          borderWidth={1}
          borderColor={tabValue === "signup" ? "$borderColorFocus" : "$borderColor"}
          backgroundColor={tabValue === "signup" ? "$backgroundFocus" : "$background"}
        >
          <Text fontWeight="700" color="$color12">
            Create account
          </Text>
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value="signin" height={0} overflow="hidden" opacity={0} aria-hidden>
        <Text height={0}> </Text>
      </Tabs.Content>
      <Tabs.Content value="signup" height={0} overflow="hidden" opacity={0} aria-hidden>
        <Text height={0}> </Text>
      </Tabs.Content>
    </Tabs>
  );
}

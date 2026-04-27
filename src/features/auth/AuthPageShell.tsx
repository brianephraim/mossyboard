import type { ReactNode, RefObject } from "react";
import { Button } from "@tamagui/button";
import { Stack, Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";
import { useNavigate } from "@tanstack/react-router";

import mossyboardIconUrl from "../../assets/branding/mossyboard-icon.png";
import type { AuthMode } from "../../auth/searchParams";
import { BoardPageChrome, BoardPill, BoardSurface } from "../boards/ui";
import { AuthModeSwitch } from "./AuthModeSwitch";

type AuthPageShellProps = Readonly<{
  mode: AuthMode;
  redirectTo: string;
  sessionExpired: boolean;
  alertRegionRef: RefObject<HTMLElement | null>;
  formHeadingRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}>;

const authModeCopy = {
  signin: {
    eyebrow: "Return to your boards",
    title: "Welcome back to Mossyboard",
    description:
      "Sign in to reopen your board rail, card details, and the exact workspace you left behind.",
    cardLabel: "Sign in",
    cardDescription: "Use your email and password to get back to work.",
  },
  signup: {
    eyebrow: "Start a calmer workspace",
    title: "Create your Mossyboard account",
    description:
      "Set up email sign-in and start planning in a workspace that stays steady, green, and focused.",
    cardLabel: "Create account",
    cardDescription: "A new account takes you straight into the board experience.",
  },
  reset: {
    eyebrow: "Password help",
    title: "Get back into Mossyboard",
    description: "Request a reset link and step back into your boards without losing momentum.",
    cardLabel: "Reset password",
    cardDescription: "We'll send a fresh reset link to the email on your account.",
  },
} satisfies Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    cardLabel: string;
    cardDescription: string;
  }
>;

const authHighlights = [
  "Warm, readable board surfaces that keep the work front and center.",
  "Keyboard-friendly flows from sign-in all the way to card detail.",
  "A lightweight email/password setup while the rest of the product takes shape.",
] as const;

export function AuthPageShell({
  mode,
  redirectTo,
  sessionExpired,
  alertRegionRef,
  formHeadingRef,
  children,
}: AuthPageShellProps) {
  const navigate = useNavigate();
  const copy = authModeCopy[mode];

  return (
    <BoardPageChrome>
      <YStack
        tag="main"
        minHeight="100vh"
        padding="$5"
        $sm={{ padding: "$4" }}
        justifyContent="center"
      >
        <XStack
          width="100%"
          maxWidth={1040}
          alignSelf="center"
          alignItems="center"
          gap="$6"
          $sm={{ flexDirection: "column", alignItems: "stretch", gap: "$4" }}
        >
          <YStack flex={1} gap="$5" minWidth={0}>
            <XStack alignItems="center" gap="$3" flexWrap="wrap">
              <Stack
                width={72}
                height={72}
                borderRadius={9999}
                backgroundColor="$boardAccentSoft"
                backgroundImage={`url(${mossyboardIconUrl})`}
                backgroundSize="cover"
                backgroundPosition="center"
                backgroundRepeat="no-repeat"
                aria-hidden
              />
              <YStack gap="$1">
                <Text fontSize="$10" fontWeight="800" color="$boardHeading">
                  Mossyboard
                </Text>
                <Text fontSize="$4" color="$boardTextMuted">
                  Steady, green, and focused.
                </Text>
              </YStack>
            </XStack>

            <YStack gap="$3" maxWidth={620}>
              <XStack>
                <BoardPill>{copy.eyebrow}</BoardPill>
              </XStack>
              <Text tag="h1" fontSize="$11" fontWeight="800" color="$boardHeading" lineHeight="$10">
                {copy.title}
              </Text>
              <Text fontSize="$5" lineHeight="$6" color="$boardTextMuted">
                {copy.description}
              </Text>
            </YStack>

            <YStack gap="$3" maxWidth={620}>
              {authHighlights.map((highlight) => (
                <XStack key={highlight} gap="$3" alignItems="flex-start">
                  <Stack
                    width={12}
                    height={12}
                    marginTop="$2"
                    borderRadius={9999}
                    backgroundColor="$boardAccentSoft"
                    borderWidth={1}
                    borderColor="$boardAccentWash"
                    aria-hidden
                  />
                  <Text flex={1} color="$boardTextMuted" fontSize="$4" lineHeight="$5">
                    {highlight}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </YStack>

          <BoardSurface width="100%" maxWidth={460} padding="$6" gap="$5" alignSelf="stretch">
            <YStack gap="$3">
              <Text
                textTransform="uppercase"
                letterSpacing={1.4}
                fontSize="$2"
                color="$boardTextSubtle"
              >
                {copy.cardLabel}
              </Text>
              <Text fontSize="$4" lineHeight="$5" color="$boardTextMuted">
                {copy.cardDescription}
              </Text>
            </YStack>

            <YStack
              ref={alertRegionRef as RefObject<HTMLDivElement>}
              tabIndex={-1}
              gap="$2"
              borderWidth={sessionExpired ? 1 : 0}
              borderColor={sessionExpired ? "rgba(129, 95, 17, 0.16)" : "transparent"}
              backgroundColor={sessionExpired ? "$boardWarningBg" : "transparent"}
              padding={sessionExpired ? "$3" : 0}
              borderRadius="$8"
              display={sessionExpired ? "flex" : "none"}
            >
              <Text tag="h2" fontSize="$5" fontWeight="800" color="$boardHeading">
                Your session expired
              </Text>
              <Text color="$boardWarningText">
                Sign in again and we'll send you right back to your boards.
              </Text>
            </YStack>

            <AuthModeSwitch mode={mode} redirectTo={redirectTo} formHeadingRef={formHeadingRef} />

            <YStack gap="$4">{children}</YStack>

            <Button
              chromeless
              alignSelf="flex-start"
              paddingHorizontal={0}
              height="auto"
              onPress={() => {
                void navigate({ to: "/", search: { redirectTo: undefined } });
              }}
            >
              <Text color="$boardAccent" textDecorationLine="underline">
                Back to home
              </Text>
            </Button>
          </BoardSurface>
        </XStack>
      </YStack>
    </BoardPageChrome>
  );
}

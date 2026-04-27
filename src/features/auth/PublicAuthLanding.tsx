import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Stack, Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import mossyboardIconUrl from "../../assets/branding/mossyboard-icon.png";
import { parseSafeRedirectTo } from "../../auth/searchParams";
import { useAuthSession, useRequiresEmailVerification } from "../../auth/session";
import { brandTextFontFamily } from "../../tamagui/fontFamilies";
import { BoardActionButton, BoardPageChrome, BoardPill, BoardSurface } from "../boards/ui";

type PublicAuthLandingProps = Readonly<{
  redirectTo?: string;
}>;

const landingHighlights = [
  "Pick up exactly where you left your boards.",
  "Keep cards, columns, and priorities in one calm workspace.",
  "Use the same keyboard-friendly flow the board UI is built around.",
] as const;

export function PublicAuthLanding({ redirectTo }: PublicAuthLandingProps) {
  const navigate = useNavigate();
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const headingRef = useRef<HTMLDivElement>(null);
  const safeRedirect = parseSafeRedirectTo(redirectTo, undefined);

  useEffect(() => {
    if (!session.hasResolvedInitialAuth || !session.isSignedIn) {
      return;
    }

    const target =
      requiresEmailVerification && !session.user?.emailVerified ? "/verify-email" : safeRedirect;

    void navigate({
      to: target,
      search: target === "/verify-email" ? { redirectTo: safeRedirect } : {},
      replace: true,
    });
  }, [
    navigate,
    requiresEmailVerification,
    safeRedirect,
    session.hasResolvedInitialAuth,
    session.isSignedIn,
    session.user,
  ]);

  useEffect(() => {
    if (session.hasResolvedInitialAuth && !session.isSignedIn) {
      headingRef.current?.focus();
    }
  }, [session.hasResolvedInitialAuth, session.isSignedIn]);

  if (!session.hasResolvedInitialAuth) {
    return (
      <LandingStatusState
        title="Loading Mossyboard..."
        description="Checking your session and warming up the sign-in flow."
      />
    );
  }

  if (session.isSignedIn) {
    return (
      <LandingStatusState
        title="Opening your boards..."
        description="Bringing your Mossyboard workspace back into view."
      />
    );
  }

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
            <XStack>
              <BoardPill>Steady, green, and focused.</BoardPill>
            </XStack>

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
                <Text
                  fontFamily={brandTextFontFamily}
                  fontSize="$10"
                  fontWeight="400"
                  color="$boardHeading"
                >
                  Mossyboard
                </Text>
                <Text fontSize="$4" color="$boardTextMuted">
                  Calm kanban for work that keeps moving.
                </Text>
              </YStack>
            </XStack>

            <YStack gap="$3" maxWidth={620}>
              <YStack ref={headingRef} tabIndex={-1} tag="h1">
                <Text
                  fontFamily="$heading"
                  fontSize="$12"
                  fontWeight="700"
                  color="$boardHeading"
                  lineHeight="$11"
                >
                  Tidy up the day and keep the board in view.
                </Text>
              </YStack>
              <Text fontSize="$5" lineHeight="$6" color="$boardTextMuted">
                Sign in to reopen your boards, or create an account to start planning in a calmer
                space.
              </Text>
            </YStack>

            <YStack gap="$3" maxWidth={620}>
              {landingHighlights.map((highlight) => (
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

          <BoardSurface
            width="100%"
            maxWidth={420}
            padding="$6"
            gap="$4"
            alignSelf="stretch"
            justifyContent="center"
          >
            <YStack gap="$3">
              <Text
                textTransform="uppercase"
                letterSpacing={1.4}
                fontSize="$2"
                color="$boardTextSubtle"
              >
                Start here
              </Text>
              <Text
                tag="h2"
                fontFamily="$heading"
                fontSize="$8"
                fontWeight="700"
                color="$boardHeading"
              >
                Sign in or create your account
              </Text>
              <Text fontSize="$4" lineHeight="$5" color="$boardTextMuted">
                Email and password are the only sign-in method in this build, which keeps the setup
                simple and the focus on your boards.
              </Text>
            </YStack>

            <YStack gap="$3" width="100%">
              <BoardActionButton
                width="100%"
                tone="accent"
                onPress={() => {
                  void navigate({
                    to: "/auth",
                    search: { mode: "signin", redirectTo: safeRedirect, reason: undefined },
                  });
                }}
              >
                Sign in
              </BoardActionButton>
              <BoardActionButton
                width="100%"
                onPress={() => {
                  void navigate({
                    to: "/auth",
                    search: { mode: "signup", redirectTo: safeRedirect, reason: undefined },
                  });
                }}
              >
                Create account
              </BoardActionButton>
            </YStack>

            <Text fontSize="$2" color="$boardTextSubtle">
              Your boards will open right after sign-in if you already have access.
            </Text>
          </BoardSurface>
        </XStack>
      </YStack>
    </BoardPageChrome>
  );
}

function LandingStatusState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <BoardPageChrome>
      <YStack tag="main" minHeight="100vh" padding="$5" justifyContent="center">
        <BoardSurface width="100%" maxWidth={460} alignSelf="center" padding="$6">
          <XStack alignItems="center" gap="$3">
            <Stack
              width={64}
              height={64}
              borderRadius={9999}
              backgroundColor="$boardAccentSoft"
              backgroundImage={`url(${mossyboardIconUrl})`}
              backgroundSize="cover"
              backgroundPosition="center"
              backgroundRepeat="no-repeat"
              aria-hidden
            />
            <YStack gap="$1">
              <Text
                fontFamily={brandTextFontFamily}
                fontSize="$9"
                fontWeight="400"
                color="$boardHeading"
              >
                Mossyboard
              </Text>
              <Text color="$boardTextMuted">Steady, green, and focused.</Text>
            </YStack>
          </XStack>

          <YStack gap="$2">
            <Text
              tag="h1"
              fontFamily="$heading"
              fontSize="$8"
              fontWeight="700"
              color="$boardHeading"
            >
              {title}
            </Text>
            <Text fontSize="$4" lineHeight="$5" color="$boardTextMuted">
              {description}
            </Text>
          </YStack>
        </BoardSurface>
      </YStack>
    </BoardPageChrome>
  );
}

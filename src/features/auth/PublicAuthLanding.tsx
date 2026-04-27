import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { parseSafeRedirectTo } from "../../auth/searchParams";
import { useAuthSession, useRequiresEmailVerification } from "../../auth/session";
import { brandTextFontFamily } from "../../tamagui/fontFamilies";
import { MossyboardBrandMark } from "../brand/MossyboardBrandMark";
import { BoardPageChrome, BoardSurface } from "../boards/ui";
import { AuthModeTabs } from "./AuthModeTabs";
import { SignUpForm } from "./SignUpForm";

type PublicAuthLandingProps = Readonly<{
  redirectTo?: string;
}>;

export function PublicAuthLanding({ redirectTo }: PublicAuthLandingProps) {
  const navigate = useNavigate();
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const headingRef = useRef<HTMLHeadingElement>(null);
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
        <BoardSurface width="100%" maxWidth={420} padding="$6" gap="$4" alignSelf="center">
          <XStack alignItems="center" gap="$3" flexWrap="wrap">
            <MossyboardBrandMark size={72} />
            <Text
              fontFamily={brandTextFontFamily}
              fontSize={50}
              fontWeight="400"
              color="$boardHeading"
            >
              Mossyboard
            </Text>
          </XStack>

          <AuthModeTabs activeMode="signup" redirectTo={safeRedirect} />

          <SignUpForm redirectTo={safeRedirect} formHeadingRef={headingRef} />
        </BoardSurface>
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
            <MossyboardBrandMark size={64} />
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

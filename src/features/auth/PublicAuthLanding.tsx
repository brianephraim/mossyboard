import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import { parseSafeRedirectTo } from "../../auth/searchParams";
import { useAuthSession, useRequiresEmailVerification } from "../../auth/session";

type PublicAuthLandingProps = Readonly<{
  redirectTo?: string;
}>;

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
      <YStack
        tag="main"
        minHeight="100vh"
        padding="$5"
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
        gap="$3"
      >
        <Text color="$color11">Loading sign-in options...</Text>
      </YStack>
    );
  }

  if (session.isSignedIn) {
    return (
      <YStack
        tag="main"
        minHeight="100vh"
        padding="$5"
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
        gap="$3"
      >
        <Text color="$color11">Opening your workspace…</Text>
      </YStack>
    );
  }

  return (
    <YStack
      tag="main"
      minHeight="100vh"
      padding="$5"
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background"
      gap="$4"
      maxWidth={560}
      width="100%"
      alignSelf="center"
    >
      <YStack gap="$3" width="100%">
        <YStack ref={headingRef} tabIndex={-1} tag="h1">
          <Text fontSize="$10" fontWeight="800" color="$color12">
            Kanban for focused teams
          </Text>
        </YStack>
        <Text fontSize="$4" lineHeight="$5" color="$color11">
          Sign in to access your boards, or create an account to get started.
        </Text>
        <Text fontSize="$2" color="$color10">
          Email and password are the only sign-in method in this version.
        </Text>
      </YStack>

      <YStack gap="$3" width="100%">
        <Button
          width="100%"
          size="$4"
          theme="active"
          onPress={() => {
            void navigate({
              to: "/auth",
              search: { mode: "signin", redirectTo: safeRedirect },
            });
          }}
        >
          Sign in
        </Button>
        <Button
          width="100%"
          size="$4"
          chromeless
          borderWidth={1}
          borderColor="$borderColor"
          onPress={() => {
            void navigate({
              to: "/auth",
              search: { mode: "signup", redirectTo: safeRedirect },
            });
          }}
        >
          Create account
        </Button>
      </YStack>
    </YStack>
  );
}

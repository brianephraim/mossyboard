import type { ReactNode, RefObject } from "react";
import { useEffect, useRef } from "react";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import type { AuthMode } from "../../auth/searchParams";
import { brandTextFontFamily } from "../../tamagui/fontFamilies";
import { MossyboardBrandMark } from "../brand/MossyboardBrandMark";
import { BoardPageChrome, BoardSurface } from "../boards/ui";
import { AuthModeTabs } from "./AuthModeTabs";

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
  // Move focus to the form heading when switching between signin/signup modes
  // so screen-reader users hear the new form context after a mode change.
  const prevMode = useRef(mode);
  useEffect(() => {
    if (prevMode.current === mode) {
      return;
    }

    if (mode === "signin" || mode === "signup") {
      formHeadingRef.current?.focus();
    }

    prevMode.current = mode;
  }, [formHeadingRef, mode]);

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
            <Text
              tag="h2"
              fontFamily="$heading"
              fontSize="$5"
              fontWeight="700"
              color="$boardHeading"
            >
              Your session expired
            </Text>
            <Text color="$boardWarningText">
              Sign in again and we&apos;ll send you right back to your boards.
            </Text>
          </YStack>

          {mode === "signin" || mode === "signup" ? (
            <AuthModeTabs activeMode={mode} redirectTo={redirectTo} />
          ) : null}

          {children}
        </BoardSurface>
      </YStack>
    </BoardPageChrome>
  );
}

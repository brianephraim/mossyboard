import type { ComponentProps, ReactNode } from "react";
import { useLinkProps } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Stack, Text, useMedia } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { brandTextFontFamily } from "../../tamagui/fontFamilies";
import { AccountSignOutControl } from "../auth/AccountSignOutControl";
import { VerificationSidebarCallout } from "../auth/VerificationSidebarCallout";
import { MossyboardBrandMark } from "../brand/MossyboardBrandMark";
import { BoardActionButton, BoardSurface } from "./ui";

export type BoardNavigationItem = Readonly<{
  id: string;
  name: string;
  columnCount: number;
  cardCount: number;
}>;

type BoardNavigationRowProps = {
  boardId: string;
  name: string;
  columnCount: number;
  cardCount: number;
  isCurrent: boolean;
  onOpenInDrawer?: (boardId: string) => void;
};

function BoardNavigationRow({
  boardId,
  name,
  columnCount: _columnCount,
  cardCount,
  isCurrent,
  onOpenInDrawer,
}: Readonly<BoardNavigationRowProps>) {
  const media = useMedia();
  const linkProps = useLinkProps({
    to: "/boards/$boardId",
    params: { boardId },
    search: {
      view: "board",
      groupBy: "column",
      card: undefined,
      priority: undefined,
      tags: undefined,
      drawer: undefined,
    },
  });

  const showDrawerButton = !media.maxMd && onOpenInDrawer && !isCurrent;

  return (
    <XStack
      position="relative"
      alignItems="center"
      gap="$3"
      paddingHorizontal="$3"
      paddingVertical="$3"
      borderRadius="$8"
      backgroundColor={isCurrent ? "$boardSidebarRowBg" : "transparent"}
      borderWidth={1}
      borderColor={isCurrent ? "$boardSidebarRowBorder" : "transparent"}
      hoverStyle={{
        backgroundColor: isCurrent ? "$boardSidebarRowBg" : "$boardSidebarRowHoverBg",
      }}
    >
      <Stack
        {...(linkProps as Record<string, unknown>)}
        tag="a"
        position="absolute"
        inset={0}
        borderRadius="$8"
        zIndex={1}
        aria-label={`Open ${name}`}
      />
      <XStack
        width={4}
        alignSelf="stretch"
        borderRadius="$8"
        backgroundColor={isCurrent ? "$boardSidebarGlow" : "transparent"}
        marginRight="$2"
        pointerEvents="none"
      />
      <YStack flex={1} gap="$1" minWidth={0} pointerEvents="none">
        <Text fontWeight="700" color="$boardSidebarText" numberOfLines={1}>
          {name}
        </Text>
        <XStack alignItems="center" justifyContent="space-between" gap="$3">
          <Text color="$boardSidebarMuted" fontSize="$2" numberOfLines={1}>
            {cardCount} cards
          </Text>
          {showDrawerButton ? (
            <Stack position="relative" zIndex={2} pointerEvents="auto" flexShrink={0}>
              <Button
                chromeless
                unstyled
                tag="button"
                padding={0}
                height="auto"
                backgroundColor="transparent"
                borderWidth={0}
                cursor="pointer"
                hoverStyle={{ backgroundColor: "transparent", opacity: 0.85 }}
                pressStyle={{ backgroundColor: "transparent" }}
                focusStyle={{
                  outlineWidth: 2,
                  outlineStyle: "solid",
                  outlineColor: "$boardSidebarGlow",
                }}
                onPress={() => onOpenInDrawer?.(boardId)}
              >
                <Text
                  color="$boardSidebarMuted"
                  fontSize="$2"
                  fontWeight="500"
                  textDecorationLine="underline"
                >
                  Open in drawer
                </Text>
              </Button>
            </Stack>
          ) : null}
        </XStack>
      </YStack>
    </XStack>
  );
}

export function BoardBrandHeader({
  titleSize = 36,
  subtitleSize = "$3",
  iconSize = 48,
}: Readonly<{
  titleSize?: ComponentProps<typeof Text>["fontSize"];
  subtitleSize?: ComponentProps<typeof Text>["fontSize"];
  iconSize?: number;
}>) {
  return (
    <XStack alignItems="center" gap="$3">
      <MossyboardBrandMark
        size={iconSize}
        backgroundColor="rgba(197, 235, 134, 0.18)"
        focusRingColor="$boardSidebarGlow"
      />
      <YStack gap="$1">
        <Text
          fontFamily={brandTextFontFamily}
          fontSize={titleSize}
          fontWeight="400"
          color="$boardSidebarText"
        >
          Mossyboard
        </Text>
        <Text fontSize={subtitleSize} color="$boardSidebarMuted">
          Steady, green, and focused.
        </Text>
      </YStack>
    </XStack>
  );
}

export function BoardNavigationList({
  boards,
  currentBoardId,
  isLoading,
  isError,
  onRetry,
  onOpenInDrawer,
  showHeading = true,
}: Readonly<{
  boards: readonly BoardNavigationItem[];
  currentBoardId?: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onOpenInDrawer?: (boardId: string) => void;
  showHeading?: boolean;
}>) {
  return (
    <YStack gap="$3">
      {showHeading ? (
        <Text
          textTransform="uppercase"
          letterSpacing={1.4}
          fontSize="$2"
          color="$boardSidebarSubtle"
        >
          Boards
        </Text>
      ) : null}

      {isLoading && boards.length === 0 ? (
        <Text color="$boardSidebarMuted">Loading boards…</Text>
      ) : isError && boards.length === 0 ? (
        <YStack gap="$2">
          <Text color="$boardDangerText">Could not load your boards.</Text>
          <BoardActionButton
            color="$boardSidebarText"
            backgroundColor="rgba(255, 255, 255, 0.04)"
            borderColor="$boardSidebarBorder"
            hoverStyle={{ backgroundColor: "$boardSidebarRowBg" }}
            pressStyle={{ backgroundColor: "$boardSidebarRowBg" }}
            onPress={onRetry}
          >
            Retry
          </BoardActionButton>
        </YStack>
      ) : boards.length === 0 ? (
        <Text color="$boardSidebarMuted">No boards yet. Create one to get moving.</Text>
      ) : (
        <YStack gap="$2">
          {boards.map((board) => (
            <BoardNavigationRow
              key={board.id}
              boardId={board.id}
              name={board.name}
              columnCount={board.columnCount}
              cardCount={board.cardCount}
              isCurrent={board.id === currentBoardId}
              onOpenInDrawer={onOpenInDrawer}
            />
          ))}
        </YStack>
      )}
    </YStack>
  );
}

export function BoardAccountPanel({
  userEmail,
  emailVerified,
  showVerificationCallout,
  onSignedOut,
}: Readonly<{
  userEmail: string | null | undefined;
  emailVerified: boolean;
  showVerificationCallout: boolean;
  onSignedOut?: () => void;
}>) {
  return (
    <BoardSurface
      padding="$4"
      backgroundColor="$boardSidebarPanelSurface"
      backgroundImage="linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0.08) 100%)"
      borderColor="$boardSidebarPanelBorder"
      boxShadow="none"
    >
      <YStack gap="$3">
        {showVerificationCallout ? <VerificationSidebarCallout /> : null}
        <YStack gap="$1">
          <Text fontWeight="700" color="$boardSidebarText" numberOfLines={1}>
            {userEmail ?? "Signed in"}
          </Text>
          <Text color="$boardSidebarMuted">
            {emailVerified ? "Verified account" : "Verification pending"}
          </Text>
        </YStack>
        <AccountSignOutControl
          buttonTone="default"
          buttonProps={{
            color: "$boardSidebarText",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            borderColor: "$boardSidebarBorder",
            hoverStyle: {
              backgroundColor: "$boardSidebarRowBg",
            },
            pressStyle: {
              backgroundColor: "$boardSidebarRowBg",
              opacity: 0.92,
            },
          }}
          errorColor="$boardDangerBg"
          onSignedOut={onSignedOut}
        />
      </YStack>
    </BoardSurface>
  );
}

export function BoardCurrentBoardMenuPanel({
  headerActions,
  boardControls,
}: Readonly<{
  headerActions?: ReactNode;
  boardControls?: ReactNode;
}>) {
  if (!headerActions && !boardControls) {
    return null;
  }

  return (
    <BoardSurface
      padding="$4"
      backgroundColor="$boardSidebarPanelSurface"
      backgroundImage="linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.08) 100%)"
      borderColor="$boardSidebarPanelBorder"
      boxShadow="none"
    >
      <YStack gap="$4">
        <Text
          textTransform="uppercase"
          letterSpacing={1.4}
          fontSize="$2"
          color="$boardSidebarSubtle"
        >
          Current board
        </Text>

        {headerActions ? (
          <YStack gap="$2.5">
            <Text fontSize="$3" fontWeight="700" color="$boardSidebarText">
              Board actions
            </Text>
            {headerActions}
          </YStack>
        ) : null}

        {boardControls ? boardControls : null}
      </YStack>
    </BoardSurface>
  );
}

export function BoardMobileMenuContent({
  headerActions,
  boardControls,
  boards,
  currentBoardId,
  isLoadingBoards,
  isBoardListError,
  onRetryBoards,
  onCreateBoard,
  onOpenInDrawer,
  userEmail,
  emailVerified,
  showVerificationCallout,
  onSignedOut,
}: Readonly<{
  headerActions?: ReactNode;
  boardControls?: ReactNode;
  boards: readonly BoardNavigationItem[];
  currentBoardId?: string;
  isLoadingBoards: boolean;
  isBoardListError: boolean;
  onRetryBoards: () => void;
  onCreateBoard: () => void;
  onOpenInDrawer?: (boardId: string) => void;
  userEmail: string | null | undefined;
  emailVerified: boolean;
  showVerificationCallout: boolean;
  onSignedOut?: () => void;
}>) {
  return (
    <YStack gap="$4" paddingBottom="$2">
      <BoardCurrentBoardMenuPanel headerActions={headerActions} boardControls={boardControls} />

      <BoardActionButton tone="accent" onPress={onCreateBoard}>
        + New board
      </BoardActionButton>

      <BoardNavigationList
        boards={boards}
        currentBoardId={currentBoardId}
        isLoading={isLoadingBoards}
        isError={isBoardListError}
        onRetry={onRetryBoards}
        onOpenInDrawer={onOpenInDrawer}
      />

      <BoardAccountPanel
        userEmail={userEmail}
        emailVerified={emailVerified}
        showVerificationCallout={showVerificationCallout}
        onSignedOut={onSignedOut}
      />
    </YStack>
  );
}

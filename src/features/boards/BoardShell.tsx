import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useLinkProps, useNavigate } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Stack, Text, useMedia } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { useAuthSession, useRequiresEmailVerification } from "../../auth/session";
import { AccountSignOutControl } from "../../features/auth/AccountSignOutControl";
import { VerificationReminderBanner } from "../../features/auth/VerificationReminderBanner";
import { FormRoot, FormTextField } from "../../form";
import { PrettyModalWrap } from "../../Modal/PrettyModalWrap";
import { trpc } from "../../trpc/client";
import {
  BoardActionButton,
  BoardLiveRegion,
  BoardPageChrome,
  BoardResponsiveColumns,
  BoardSectionHeading,
  BoardSurface,
} from "./ui";

type CreateBoardForm = {
  name: string;
};

type BoardShellProps = {
  currentBoardId?: string;
  title: ReactNode;
  subtitle?: string;
  announcement?: string | null;
  headerActions?: ReactNode;
  renderContent: (controls: { openCreateBoard: () => void }) => ReactNode;
  onOpenInDrawer?: (boardId: string) => void;
};

type BoardRailBoardRowProps = {
  boardId: string;
  name: string;
  columnCount: number;
  cardCount: number;
  isCurrent: boolean;
  onOpenInDrawer?: (boardId: string) => void;
};

function BoardRailBoardRow({
  boardId,
  name,
  columnCount,
  cardCount,
  isCurrent,
  onOpenInDrawer,
}: Readonly<BoardRailBoardRowProps>) {
  const media = useMedia();
  const linkProps = useLinkProps({
    to: "/boards/$boardId",
    params: { boardId },
    search: {
      view: "board",
      groupBy: "column",
      card: undefined,
      priority: undefined,
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
      backgroundColor={isCurrent ? "$boardAccentSoft" : "transparent"}
      borderWidth={1}
      borderColor={isCurrent ? "$boardAccentWash" : "transparent"}
      hoverStyle={{ backgroundColor: "$boardAccentWash" }}
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
        backgroundColor={isCurrent ? "$boardAccent" : "transparent"}
        marginRight="$2"
        pointerEvents="none"
      />
      <YStack flex={1} gap="$1" minWidth={0} pointerEvents="none">
        <Text fontWeight="700" color="$boardHeading" numberOfLines={1}>
          {name}
        </Text>
        <Text color="$boardTextMuted" fontSize="$2">
          {columnCount} columns • {cardCount} cards
        </Text>
      </YStack>
      {showDrawerButton ? (
        <Stack position="relative" zIndex={2}>
          <Button
            chromeless
            unstyled
            tag="button"
            paddingHorizontal="$2"
            paddingVertical="$1"
            height="auto"
            backgroundColor="transparent"
            borderWidth={0}
            cursor="pointer"
            hoverStyle={{ backgroundColor: "transparent", opacity: 0.85 }}
            pressStyle={{ backgroundColor: "transparent" }}
            focusStyle={{
              outlineWidth: 2,
              outlineStyle: "solid",
              outlineColor: "$boardAccent",
            }}
            onPress={() => onOpenInDrawer?.(boardId)}
          >
            <Text
              color="$boardTextMuted"
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
  );
}

export function BoardShell({
  currentBoardId,
  title,
  subtitle,
  announcement,
  headerActions,
  renderContent,
  onOpenInDrawer,
}: Readonly<BoardShellProps>) {
  const media = useMedia();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [shellAnnouncement, setShellAnnouncement] = useState<string | null>(null);
  const createBoardFormId = useId();
  const boardsQuery = trpc.board.list.useQuery({});
  const createBoardForm = useForm<CreateBoardForm>({
    defaultValues: {
      name: "",
    },
  });

  const createBoard = trpc.board.create.useMutation({
    onSuccess: async ({ boardId }) => {
      createBoardForm.reset({ name: "" });
      setCreateBoardOpen(false);
      setShellAnnouncement("Board created.");
      await utils.board.list.invalidate();
      void navigate({
        to: "/boards/$boardId",
        params: { boardId },
        search: {
          view: "board",
          groupBy: "column",
          card: undefined,
          priority: undefined,
          drawer: undefined,
        },
      });
    },
  });

  useEffect(() => {
    if (!createBoardOpen) {
      createBoardForm.reset({ name: "" });
    }
  }, [createBoardForm, createBoardOpen]);

  const verificationBanner =
    session.user && !session.user.emailVerified && !requiresEmailVerification ? (
      <VerificationReminderBanner userEmail={session.user.email} />
    ) : null;

  const boardList = boardsQuery.data?.boards ?? [];
  const boardRail = (
    <BoardSurface padding="$4" flex={1} minHeight={0}>
      <YStack
        gap="$4"
        flex={1}
        minHeight={
          media.maxMd
            ? "auto"
            : // BoardResponsiveColumns desktop XStack: $4 top+bottom. BoardSurface: $4 padding + 1px border each vertical side.
              "calc(100vh - 4 * var(--c-space-4) - 2px)"
        }
      >
        <YStack gap="$3">
          <XStack alignItems="center" gap="$3">
            <Stack
              width={48}
              height={48}
              borderRadius={9999}
              backgroundColor="$boardAccentSoft"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="$boardAccent" fontSize="$6" fontWeight="800" aria-hidden>
                ↟
              </Text>
            </Stack>
            <YStack gap="$1">
              <Text fontSize="$9" fontWeight="800" color="$boardHeading">
                Mossyboard
              </Text>
              <Text color="$boardTextMuted">Steady, green, and focused.</Text>
            </YStack>
          </XStack>

          <BoardActionButton tone="accent" onPress={() => setCreateBoardOpen(true)}>
            + New board
          </BoardActionButton>
        </YStack>

        <YStack gap="$3">
          <Text
            textTransform="uppercase"
            letterSpacing={1.4}
            fontSize="$2"
            color="$boardTextSubtle"
          >
            Boards
          </Text>

          {boardsQuery.isLoading && boardList.length === 0 ? (
            <Text color="$boardTextMuted">Loading boards…</Text>
          ) : boardsQuery.isError && boardList.length === 0 ? (
            <YStack gap="$2">
              <Text color="$boardDangerText">Could not load your boards.</Text>
              <BoardActionButton tone="ghost" onPress={() => void boardsQuery.refetch()}>
                Retry
              </BoardActionButton>
            </YStack>
          ) : boardList.length === 0 ? (
            <Text color="$boardTextMuted">No boards yet. Create one to get moving.</Text>
          ) : (
            <YStack gap="$2">
              {boardList.map((board) => (
                <BoardRailBoardRow
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

        <YStack marginTop="auto" gap="$3">
          <BoardSurface padding="$4">
            <YStack gap="$3">
              <YStack gap="$1">
                <Text fontWeight="700" color="$boardHeading" numberOfLines={1}>
                  {session.user?.email ?? "Signed in"}
                </Text>
                <Text color="$boardTextMuted">
                  {session.user?.emailVerified ? "Verified account" : "Verification pending"}
                </Text>
              </YStack>
              <AccountSignOutControl
                onSignedOut={() => {
                  setShellAnnouncement("Signed out.");
                }}
              />
            </YStack>
          </BoardSurface>
        </YStack>
      </YStack>
    </BoardSurface>
  );

  const headerControls = headerActions ?? null;

  return (
    <BoardPageChrome>
      <BoardLiveRegion message={shellAnnouncement ?? announcement ?? null} />
      <BoardResponsiveColumns
        rail={boardRail}
        content={
          <BoardSurface
            padding="$0"
            flex={1}
            overflow="hidden"
            height={
              media.maxMd
                ? "auto"
                : // BoardResponsiveColumns desktop XStack: $4 top+bottom. BoardSurface: 1px border each vertical side.
                  "calc(100vh - 2 * var(--c-space-4) - 2px)"
            }
          >
            <YStack padding="$5" paddingBottom="$0" gap="$5" flexShrink={0}>
              <BoardSectionHeading
                eyebrow="Workspace"
                title={title}
                subtitle={subtitle}
                actions={headerControls}
              />
              {verificationBanner}
            </YStack>
            <YStack flex={1} minHeight={0} overflow="hidden">
              {renderContent({
                openCreateBoard: () => {
                  setCreateBoardOpen(true);
                },
              })}
            </YStack>
          </BoardSurface>
        }
      />

      <PrettyModalWrap
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
        title="Create board"
        description="Start with a new board and we’ll seed it with the default workflow columns."
        footer={
          <>
            <BoardActionButton tone="ghost" onPress={() => setCreateBoardOpen(false)}>
              Cancel
            </BoardActionButton>
            <BoardActionButton
              tone="accent"
              type="submit"
              form={createBoardFormId}
              disabled={createBoard.isPending}
            >
              {createBoard.isPending ? "Creating…" : "Create board"}
            </BoardActionButton>
          </>
        }
      >
        <YStack gap="$3">
          <FormRoot
            id={createBoardFormId}
            form={createBoardForm}
            gap="$3"
            onSubmit={async (values) => {
              await createBoard.mutateAsync(values);
            }}
          >
            <FormTextField<CreateBoardForm, "name">
              name="name"
              label="Board name"
              rules={{
                required: "Board name is required.",
                minLength: { value: 1, message: "Board name is required." },
                maxLength: { value: 80, message: "Keep the name under 80 characters." },
              }}
              fieldProps={{ gap: "$2" }}
              labelProps={{ color: "$boardHeading", fontWeight: "600" }}
              placeholder="Product launch"
              autoFocus
              backgroundColor="$boardPanelSurfaceStrong"
              defaultBorderColor="$boardShellBorder"
            />
          </FormRoot>
          {createBoard.error ? (
            <Text color="$boardDangerText">{createBoard.error.message}</Text>
          ) : null}
        </YStack>
      </PrettyModalWrap>
    </BoardPageChrome>
  );
}

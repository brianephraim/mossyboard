import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useLinkProps, useNavigate } from "@tanstack/react-router";
import { Input } from "@tamagui/input";
import { Stack, Text, useMedia } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { useAuthSession, useRequiresEmailVerification } from "../../auth/session";
import { AccountSignOutControl } from "../../features/auth/AccountSignOutControl";
import { VerificationReminderBanner } from "../../features/auth/VerificationReminderBanner";
import { PrettyModalWrap } from "../../Modal/PrettyModalWrap";
import { trpc } from "../../trpc/client";
import { tamaguiInputValueOnChange } from "../../tamaguiRhfWebField";
import {
  BoardActionButton,
  BoardLiveRegion,
  BoardPageChrome,
  BoardPill,
  BoardResponsiveColumns,
  BoardSectionHeading,
  BoardSurface,
} from "./ui";

type CreateBoardForm = {
  name: string;
};

type BoardShellProps = {
  currentBoardId?: string;
  title: string;
  subtitle?: string;
  announcement?: string | null;
  headerActions?: ReactNode;
  renderContent: (controls: { openCreateBoard: () => void }) => ReactNode;
};

type BoardRailBoardRowProps = {
  boardId: string;
  name: string;
  columnCount: number;
  cardCount: number;
  isCurrent: boolean;
};

function BoardRailBoardRow({
  boardId,
  name,
  columnCount,
  cardCount,
  isCurrent,
}: Readonly<BoardRailBoardRowProps>) {
  const linkProps = useLinkProps({
    to: "/boards/$boardId",
    params: { boardId },
  });

  return (
    <XStack
      {...(linkProps as Record<string, unknown>)}
      tag="a"
      textDecorationLine="none"
      cursor="pointer"
      alignItems="center"
      justifyContent="space-between"
      gap="$3"
      paddingHorizontal="$3"
      paddingVertical="$3"
      borderRadius="$8"
      backgroundColor={isCurrent ? "$boardAccentSoft" : "transparent"}
      borderWidth={1}
      borderColor={isCurrent ? "$boardAccentWash" : "transparent"}
      hoverStyle={{
        backgroundColor: "$boardAccentWash",
      }}
    >
      <YStack flex={1} gap="$1" minWidth={0}>
        <Text fontWeight="700" color="$boardHeading" numberOfLines={1}>
          {name}
        </Text>
        <Text color="$boardTextMuted" fontSize="$2">
          {columnCount} columns • {cardCount} cards
        </Text>
      </YStack>
      {isCurrent ? <BoardPill>Open</BoardPill> : null}
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
}: Readonly<BoardShellProps>) {
  const media = useMedia();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [shellAnnouncement, setShellAnnouncement] = useState<string | null>(null);
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
      void navigate({ to: "/boards/$boardId", params: { boardId } });
    },
  });

  const submitCreateBoard = createBoardForm.handleSubmit(async (values) => {
    await createBoard.mutateAsync(values);
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
    <BoardSurface padding="$4">
      <YStack
        gap="$4"
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
                />
              ))}
            </YStack>
          )}
        </YStack>

        <YStack marginTop="auto" gap="$3">
          <BoardSurface padding="$4">
            <YStack gap="$2">
              <Text fontWeight="700" color="$boardHeading">
                Stay grounded.
              </Text>
              <Text color="$boardTextMuted">
                This first pass follows the repo mockup and keeps the board calm, readable, and
                keyboard-friendly.
              </Text>
            </YStack>
          </BoardSurface>

          <BoardSurface padding="$4">
            <YStack gap="$1">
              <Text fontWeight="700" color="$boardHeading" numberOfLines={1}>
                {session.user?.email ?? "Signed in"}
              </Text>
              <Text color="$boardTextMuted">
                {session.user?.emailVerified ? "Verified account" : "Verification pending"}
              </Text>
            </YStack>
          </BoardSurface>
        </YStack>
      </YStack>
    </BoardSurface>
  );

  const headerControls = useMemo(
    () => (
      <>
        <BoardActionButton tone="accent" onPress={() => setCreateBoardOpen(true)}>
          Create board
        </BoardActionButton>
        {headerActions}
        <AccountSignOutControl
          onSignedOut={() => {
            setShellAnnouncement("Signed out.");
          }}
        />
      </>
    ),
    [headerActions],
  );

  return (
    <BoardPageChrome>
      <BoardLiveRegion message={shellAnnouncement ?? announcement ?? null} />
      <BoardResponsiveColumns
        rail={boardRail}
        content={
          <BoardSurface padding="$0">
            <YStack padding="$5" paddingBottom="$0" gap="$5">
              <BoardSectionHeading
                eyebrow="Workspace"
                title={title}
                subtitle={subtitle}
                actions={headerControls}
              />
              {verificationBanner}
            </YStack>
            {renderContent({
              openCreateBoard: () => {
                setCreateBoardOpen(true);
              },
            })}
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
              disabled={createBoard.isPending}
              onPress={() => void submitCreateBoard()}
            >
              {createBoard.isPending ? "Creating…" : "Create board"}
            </BoardActionButton>
          </>
        }
      >
        <YStack gap="$3">
          <YStack tag="label" gap="$2">
            <Text color="$boardHeading" fontWeight="600">
              Board name
            </Text>
            <Controller
              control={createBoardForm.control}
              name="name"
              rules={{
                required: "Board name is required.",
                minLength: { value: 1, message: "Board name is required." },
                maxLength: { value: 80, message: "Keep the name under 80 characters." },
              }}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={tamaguiInputValueOnChange(field.onChange)}
                  onBlur={field.onBlur}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if ("isComposing" in e.nativeEvent && e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    void submitCreateBoard();
                  }}
                  placeholder="Product launch"
                  autoFocus
                  backgroundColor="$boardPanelSurfaceStrong"
                  borderColor="$boardShellBorder"
                />
              )}
            />
          </YStack>
          {createBoardForm.formState.errors.name ? (
            <Text color="$boardDangerText">{createBoardForm.formState.errors.name.message}</Text>
          ) : null}
          {createBoard.error ? (
            <Text color="$boardDangerText">{createBoard.error.message}</Text>
          ) : null}
        </YStack>
      </PrettyModalWrap>
    </BoardPageChrome>
  );
}

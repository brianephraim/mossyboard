import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { Text, useMedia } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { useAuthSession, useRequiresEmailVerification } from "../../auth/session";
import { FormRoot, FormTextField } from "../../form";
import { PrettyModalWrap } from "../../Modal/PrettyModalWrap";
import { trpc } from "../../trpc/client";
import {
  BoardAccountPanel,
  BoardBrandHeader,
  BoardMobileMenuContent,
  BoardNavigationList,
} from "./BoardMobileMenuContent";
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
  mobileMenuContent?: ReactNode;
  contentBottomInsetPx?: number;
  renderContent: (controls: { openCreateBoard: () => void }) => ReactNode;
  overlay?: ReactNode;
  onOpenInDrawer?: (boardId: string) => void;
};

export function BoardShell({
  currentBoardId,
  title,
  subtitle,
  announcement,
  headerActions,
  mobileMenuContent,
  contentBottomInsetPx = 0,
  renderContent,
  overlay,
  onOpenInDrawer,
}: Readonly<BoardShellProps>) {
  const media = useMedia();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
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
          tags: undefined,
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

  useEffect(() => {
    if (!media.maxMd) {
      setMobileRailOpen(false);
    }
  }, [media.maxMd]);

  const boardList = boardsQuery.data?.boards ?? [];
  const desktopRailHeight = "calc(100vh - 4 * var(--c-space-4) - 2px)";
  const showVerificationCallout = Boolean(
    session.user && !session.user.emailVerified && !requiresEmailVerification,
  );
  const boardRail = (
    <BoardSurface
      padding="$4"
      flex={1}
      minHeight={0}
      overflow="hidden"
      height={media.maxMd ? "auto" : desktopRailHeight}
      backgroundColor="$boardSidebarSurface"
      backgroundImage="linear-gradient(180deg, var(--c-color-boardSidebarSurface) 0%, var(--c-color-boardSidebarSurfaceBottom) 100%)"
      borderColor="$boardSidebarBorder"
      boxShadow="rgba(6, 10, 7, 0.36) 0px 24px 72px"
    >
      <YStack gap="$4" flex={1} minHeight={0}>
        <YStack gap="$3">
          <BoardBrandHeader />

          <BoardActionButton tone="accent" onPress={() => setCreateBoardOpen(true)}>
            + New board
          </BoardActionButton>
          <Text
            textTransform="uppercase"
            letterSpacing={1.4}
            fontSize="$2"
            color="$boardSidebarSubtle"
          >
            Boards
          </Text>
        </YStack>

        <YStack flex={1} minHeight={0} overflow="scroll" paddingRight="$1" paddingBottom="$2">
          <BoardNavigationList
            boards={boardList}
            currentBoardId={currentBoardId}
            isLoading={boardsQuery.isLoading}
            isError={boardsQuery.isError}
            onRetry={() => void boardsQuery.refetch()}
            onOpenInDrawer={onOpenInDrawer}
            showHeading={false}
          />
        </YStack>

        <YStack flexShrink={0} gap="$3">
          <BoardAccountPanel
            userEmail={session.user?.email}
            emailVerified={Boolean(session.user?.emailVerified)}
            showVerificationCallout={showVerificationCallout}
            onSignedOut={() => {
              setShellAnnouncement("Signed out.");
            }}
          />
        </YStack>
      </YStack>
    </BoardSurface>
  );

  const headerControls = (
    <BoardActionButton
      tone="ghost"
      aria-label={media.maxMd ? "Open sidebar menu" : "Open board menu"}
      onPress={() => setMobileRailOpen(true)}
      paddingHorizontal="$2"
      minWidth={44}
      color={media.maxMd ? undefined : "$boardHeading"}
    >
      <Text
        aria-hidden
        fontSize={media.maxMd ? "$6" : "$8"}
        lineHeight={media.maxMd ? "$1" : "$2"}
        fontWeight={media.maxMd ? "400" : "800"}
        color={media.maxMd ? undefined : "$boardHeading"}
      >
        {media.maxMd ? "☰" : "⋮"}
      </Text>
    </BoardActionButton>
  );

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
            backgroundColor="$boardPanelSurfaceStrong"
            height={
              media.maxMd
                ? "auto"
                : // BoardResponsiveColumns desktop XStack: $4 top+bottom. BoardSurface: 1px border each vertical side.
                  "calc(100vh - 2 * var(--c-space-4) - 2px)"
            }
            boxShadow="rgba(7, 12, 7, 0.18) 0px 26px 70px"
          >
            <YStack padding="$5" paddingBottom="$0" gap="$5" flexShrink={0}>
              <BoardSectionHeading title={title} subtitle={subtitle} actions={headerControls} />
            </YStack>
            <YStack
              flex={1}
              minHeight={0}
              overflow="hidden"
              paddingBottom={!media.maxMd && contentBottomInsetPx > 0 ? contentBottomInsetPx : 0}
            >
              {renderContent({
                openCreateBoard: () => {
                  setCreateBoardOpen(true);
                },
              })}
            </YStack>
          </BoardSurface>
        }
      />

      {overlay}

      <PrettyModalWrap
        open={mobileRailOpen}
        onOpenChange={setMobileRailOpen}
        title={
          media.maxMd ? (
            <BoardBrandHeader titleSize="$8" subtitleSize="$2" iconSize={44} />
          ) : (
            "Board actions"
          )
        }
        description={undefined}
        chromeTone="sidebar"
        footer={undefined}
        desktopWidth={media.maxMd ? undefined : 420}
      >
        {media.maxMd ? (
          <BoardMobileMenuContent
            headerActions={headerActions}
            boardControls={mobileMenuContent}
            boards={boardList}
            currentBoardId={currentBoardId}
            isLoadingBoards={boardsQuery.isLoading}
            isBoardListError={boardsQuery.isError}
            onRetryBoards={() => void boardsQuery.refetch()}
            onCreateBoard={() => {
              setCreateBoardOpen(true);
            }}
            onOpenInDrawer={onOpenInDrawer}
            userEmail={session.user?.email}
            emailVerified={Boolean(session.user?.emailVerified)}
            showVerificationCallout={showVerificationCallout}
            onSignedOut={() => {
              setShellAnnouncement("Signed out.");
            }}
          />
        ) : (
          <YStack maxHeight="70vh" overflow="scroll" gap="$3" paddingBottom="$1">
            {headerActions ? (
              headerActions
            ) : (
              <Text color="$boardSidebarMuted">No board actions.</Text>
            )}
          </YStack>
        )}
      </PrettyModalWrap>

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

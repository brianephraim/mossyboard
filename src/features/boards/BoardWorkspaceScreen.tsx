import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Sensor, SensorAPI } from "@hello-pangea/dnd";
import { DragDropContext } from "@hello-pangea/dnd";
import { useNavigate } from "@tanstack/react-router";
import { Text, useMedia } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import { FormRoot, FormTextField } from "../../form";
import { PrettyModalWrap } from "../../Modal/PrettyModalWrap";
import { trpc } from "../../trpc/client";
import { BoardDrawer } from "./BoardDrawer";
import { BoardPane } from "./BoardPane";
import { BoardShell } from "./BoardShell";
import { CardDetailSurface } from "./CardDetailSurface";
import { EditableBoardTitle } from "./EditableBoardTitle";
import { parseBoardDetailSearch, serializePriorityFilter, togglePrioritySelection } from "./model";
import type { BoardDetailSearch, LoadedBoard } from "./types";
import { BoardActionButton, BoardLiveRegion } from "./ui";
import { useBoardMutations } from "./useBoardMutations";
import { useDualBoardDnd } from "./useDualBoardDnd";
import { useTagMutations } from "./useTagMutations";

type DeleteBoardModalProps = Readonly<{
  open: boolean;
  boardName: string | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}>;

type RawBoardDetailSearch = {
  card?: string;
  view?: BoardDetailSearch["view"];
  groupBy?: BoardDetailSearch["groupBy"];
  priority?: string;
  drawer?: string;
};

type BoardPaneState = {
  optimisticBoard: LoadedBoard | null;
  setOptimisticBoard: (b: LoadedBoard | null) => void;
  conflictMessage: string | null;
  setConflictMessage: (m: string | null) => void;
};

function useBoardPaneState(boardId: string) {
  const [optimisticBoard, setOptimisticBoard] = useState<LoadedBoard | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticBoard(null);
    setConflictMessage(null);
  }, [boardId]);

  return {
    optimisticBoard,
    setOptimisticBoard,
    conflictMessage,
    setConflictMessage,
  } satisfies BoardPaneState;
}

function resolveDrawerId(input: string | undefined, mainBoardId: string, narrow: boolean) {
  if (!input) {
    return null;
  }
  if (narrow) {
    return null;
  }
  if (input === mainBoardId) {
    return null;
  }
  return input;
}

const drawerHeightStorageKey = "boardDrawerHeightPx";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readDrawerHeightPx() {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(drawerHeightStorageKey);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function defaultDrawerHeightPx() {
  if (typeof window === "undefined") {
    return 480;
  }
  return Math.round(window.innerHeight * 0.6);
}

function getDrawerBoundsPx() {
  if (typeof window === "undefined") {
    return { min: 240, max: 720 };
  }
  const min = Math.min(240, Math.round(window.innerHeight * 0.25));
  const max = Math.round(window.innerHeight * 0.9);
  return { min, max };
}

export function BoardWorkspaceScreen({
  boardId,
  rawSearch,
}: Readonly<{
  boardId: string;
  rawSearch: RawBoardDetailSearch;
}>) {
  const media = useMedia();
  const navigate = useNavigate({ from: "/boards/$boardId" });
  const utils = trpc.useUtils();
  const search = parseBoardDetailSearch(rawSearch as Record<string, unknown>);

  const drawerBoardId = resolveDrawerId(search.drawer, boardId, media.maxMd);

  useEffect(() => {
    if (search.drawer && search.drawer === boardId) {
      void navigate({
        params: { boardId },
        search: (previous) => ({ ...previous, drawer: undefined }),
        replace: true,
      });
    }
  }, [boardId, navigate, search.drawer]);

  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [createCardTarget, setCreateCardTarget] = useState<{
    boardId: string;
    columnId: string;
  } | null>(null);
  const [createColumnTarget, setCreateColumnTarget] = useState<{
    boardId: string;
    afterColumnId: string | null;
  } | null>(null);
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [drawerHeightPx, setDrawerHeightPx] = useState<number>(() => {
    const fromStorage = readDrawerHeightPx();
    const { min, max } = getDrawerBoundsPx();
    const initial = fromStorage ?? defaultDrawerHeightPx();
    return clamp(initial, min, max);
  });

  useEffect(() => {
    if (!drawerBoardId) {
      return;
    }
    const fromStorage = readDrawerHeightPx();
    const { min, max } = getDrawerBoundsPx();
    const initial = fromStorage ?? defaultDrawerHeightPx();
    setDrawerHeightPx(clamp(initial, min, max));
  }, [drawerBoardId]);

  const updateRouteSearch = (patch: Partial<RawBoardDetailSearch>, replace?: boolean) => {
    void navigate({
      params: { boardId },
      search: (previous) => ({
        ...previous,
        ...patch,
      }),
      replace: Boolean(replace),
    });
  };

  const mainQuery = trpc.board.getWithColumnsAndCards.useQuery(
    { boardId },
    {
      retry: false,
    },
  );

  const drawerQuery = trpc.board.getWithColumnsAndCards.useQuery(
    { boardId: drawerBoardId ?? "" },
    {
      enabled: Boolean(drawerBoardId),
      retry: false,
    },
  );

  const mainState = useBoardPaneState(boardId);
  const drawerState = useBoardPaneState(drawerBoardId ?? "none");

  const mainMutations = useBoardMutations({
    boardId,
    boardQuery: mainQuery,
    setAnnouncement,
    state: mainState,
  });
  const drawerMutations = useBoardMutations({
    boardId: drawerBoardId,
    boardQuery: drawerQuery,
    setAnnouncement,
    state: drawerState,
  });

  const tagListQuery = trpc.tag.list.useQuery({});
  const availableTags = useMemo(() => tagListQuery.data ?? [], [tagListQuery.data]);

  const onAnnounceTag = (message: string) => setAnnouncement(message);
  const mainTagMutations = useTagMutations({
    boardId,
    onAnnounce: onAnnounceTag,
  });
  const drawerTagMutations = useTagMutations({
    boardId: drawerBoardId,
    onAnnounce: onAnnounceTag,
  });

  const sensorApi = useRef<SensorAPI | null>(null);
  const programmaticSensor: Sensor = useMemo(() => {
    return (api) => {
      sensorApi.current = api;
    };
  }, [sensorApi]);

  const mainBoard = mainState.optimisticBoard ?? mainQuery.data?.board ?? null;
  const drawerBoard = drawerState.optimisticBoard ?? drawerQuery.data?.board ?? null;

  const onDragEnd = useDualBoardDnd({
    search,
    main: {
      boardKey: "main",
      boardId,
      board: mainBoard,
      state: mainState,
      mutations: mainMutations,
    },
    drawer: drawerBoardId
      ? {
          boardKey: "drawer",
          boardId: drawerBoardId,
          board: drawerBoard,
          state: drawerState,
          mutations: drawerMutations,
        }
      : null,
    utils,
    setAnnouncement,
  });

  const selectedCardId = search.card;

  const title: ReactNode = mainBoard ? (
    <EditableBoardTitle
      title={mainBoard.name}
      disabled={mainMutations.renameBoard.isPending}
      onSave={async (name) => {
        await mainMutations.renameBoard.mutateAsync({
          boardId,
          name,
        });
      }}
    />
  ) : (
    "Board"
  );

  const cardCandidateBoardIds = useMemo(() => {
    const ids: string[] = [boardId];
    if (drawerBoardId) {
      ids.push(drawerBoardId);
    }
    return ids;
  }, [boardId, drawerBoardId]);

  return (
    <DragDropContext onDragEnd={onDragEnd} sensors={[programmaticSensor]}>
      <BoardLiveRegion message={announcement} />
      <BoardShell
        currentBoardId={boardId}
        onOpenInDrawer={(id) => updateRouteSearch({ drawer: id })}
        title={title}
        subtitle="Plan, filter, regroup, and move work without leaving the board route."
        contentBottomInsetPx={drawerBoardId ? drawerHeightPx : 0}
        headerActions={
          <BoardActionButton tone="danger" onPress={() => setDeleteBoardOpen(true)}>
            Delete board
          </BoardActionButton>
        }
        announcement={announcement}
        renderContent={() => (
          <YStack flex={1} minHeight={0}>
            <BoardPane
              role="main"
              boardKey="main"
              boardId={boardId}
              search={search}
              programmaticSensorApiRef={sensorApi}
              boardQuery={mainQuery}
              state={mainState}
              mutations={mainMutations}
              availableTags={availableTags}
              onAddTag={mainTagMutations.addTag}
              onDetachTag={mainTagMutations.detachTag}
              onOpenCard={(cardId) => updateRouteSearch({ card: cardId })}
              onOpenCreateCard={(targetBoardId, columnId) =>
                setCreateCardTarget({ boardId: targetBoardId, columnId })
              }
              onOpenCreateColumn={(targetBoardId, afterColumnId) =>
                setCreateColumnTarget({ boardId: targetBoardId, afterColumnId })
              }
              bottomScrollPadding={drawerBoardId ? 24 : undefined}
              onSetView={(view) => updateRouteSearch({ view })}
              onSetGroupBy={(groupBy) => {
                updateRouteSearch({ groupBy });
                setAnnouncement("Board grouping updated.");
              }}
              onTogglePriority={(priority) => {
                const nextPriority = togglePrioritySelection(search.priority, priority);
                updateRouteSearch({ priority: serializePriorityFilter(nextPriority) });
              }}
              onClearPriority={() => updateRouteSearch({ priority: undefined })}
            />
          </YStack>
        )}
        overlay={
          drawerBoardId ? (
            <BoardDrawer
              boardId={drawerBoardId}
              boardName={drawerQuery.data?.board?.name ?? null}
              onClose={() => updateRouteSearch({ drawer: undefined })}
              onPromote={() => {
                void navigate({
                  to: "/boards/$boardId",
                  params: { boardId: drawerBoardId },
                  search: {
                    card: search.card,
                    view: search.view,
                    groupBy: search.groupBy,
                    priority: serializePriorityFilter(search.priority),
                    drawer: undefined,
                  },
                });
              }}
              onHeightChange={(px) => {
                const { min, max } = getDrawerBoundsPx();
                const next = clamp(px, min, max);
                setDrawerHeightPx(next);
              }}
            >
              {drawerQuery.isError && !drawerQuery.data ? (
                <YStack padding="$4" gap="$3">
                  <Text color="$boardDangerText">Could not load drawer board.</Text>
                  <BoardActionButton
                    tone="ghost"
                    onPress={() => updateRouteSearch({ drawer: undefined })}
                  >
                    Close
                  </BoardActionButton>
                  <BoardActionButton tone="ghost" onPress={() => void drawerQuery.refetch()}>
                    Retry
                  </BoardActionButton>
                </YStack>
              ) : (
                <BoardPane
                  role="drawer"
                  boardKey="drawer"
                  boardId={drawerBoardId}
                  search={search}
                  programmaticSensorApiRef={sensorApi}
                  boardQuery={drawerQuery}
                  state={drawerState}
                  mutations={drawerMutations}
                  availableTags={availableTags}
                  onAddTag={drawerTagMutations.addTag}
                  onDetachTag={drawerTagMutations.detachTag}
                  onOpenCard={(cardId) => updateRouteSearch({ card: cardId })}
                  onOpenCreateCard={(targetBoardId, columnId) =>
                    setCreateCardTarget({ boardId: targetBoardId, columnId })
                  }
                  onOpenCreateColumn={(targetBoardId, afterColumnId) =>
                    setCreateColumnTarget({ boardId: targetBoardId, afterColumnId })
                  }
                />
              )}
            </BoardDrawer>
          ) : null
        }
      />

      <CardDetailSurface
        open={Boolean(selectedCardId)}
        cardId={selectedCardId}
        boardId={cardCandidateBoardIds[0] ?? boardId}
        candidateBoardIds={cardCandidateBoardIds}
        onOpenChange={(open) => {
          if (!open) {
            updateRouteSearch({ card: undefined });
          }
        }}
        onDeleted={() => {
          updateRouteSearch({ card: undefined });
        }}
        onBoardChanged={async () => {
          await Promise.all([
            mainQuery.refetch(),
            drawerBoardId ? drawerQuery.refetch() : Promise.resolve(),
          ]);
        }}
        onAnnounce={setAnnouncement}
      />

      <DeleteBoardConfirmModal
        open={deleteBoardOpen}
        boardName={mainBoard?.name ?? null}
        isDeleting={mainMutations.deleteBoard.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteBoardOpen(false);
          }
        }}
        onConfirm={async () => {
          await mainMutations.deleteBoard.mutateAsync({ boardId });
          setDeleteBoardOpen(false);
          void navigate({ to: "/boards", search: { status: "deleted" } });
        }}
      />

      <CreateCardModal
        openTarget={createCardTarget}
        onOpenTargetChange={setCreateCardTarget}
        onCreate={async (target) => {
          const mutations = target.boardId === boardId ? mainMutations : drawerMutations;
          const result = await mutations.createCard.mutateAsync({
            columnId: target.columnId,
            title: target.title,
          });
          setCreateCardTarget(null);
          updateRouteSearch({ card: result.cardId });
        }}
      />

      <CreateColumnModal
        openTarget={createColumnTarget}
        onOpenTargetChange={setCreateColumnTarget}
        getBoard={(targetBoardId) =>
          targetBoardId === boardId
            ? mainBoard
            : targetBoardId === drawerBoardId
              ? drawerBoard
              : null
        }
        onCreate={async (target) => {
          const mutations = target.boardId === boardId ? mainMutations : drawerMutations;
          const activeBoard = target.boardId === boardId ? mainBoard : drawerBoard;
          if (!activeBoard) {
            return;
          }
          const previousColumn =
            target.afterColumnId === null
              ? activeBoard.columns[activeBoard.columns.length - 1]
              : activeBoard.columns.find((c) => c.id === target.afterColumnId);
          const previousIndex = previousColumn
            ? activeBoard.columns.findIndex((c) => c.id === previousColumn.id)
            : -1;
          const nextColumn =
            previousIndex >= 0 ? activeBoard.columns[previousIndex + 1] : activeBoard.columns[0];
          await mutations.createColumn.mutateAsync({
            boardId: target.boardId,
            title: target.title,
            prevColumnId: previousColumn?.id ?? null,
            nextColumnId: nextColumn?.id ?? null,
          });
          setCreateColumnTarget(null);
        }}
      />
    </DragDropContext>
  );
}

type CreateCardForm = { title: string };

function CreateCardModal({
  openTarget,
  onOpenTargetChange,
  onCreate,
}: Readonly<{
  openTarget: { boardId: string; columnId: string } | null;
  onOpenTargetChange: (t: { boardId: string; columnId: string } | null) => void;
  onCreate: (input: { boardId: string; columnId: string; title: string }) => Promise<void>;
}>) {
  const formId = useMemo(() => `create-card-${Math.random().toString(36).slice(2)}`, []);
  const form = useForm<CreateCardForm>({ defaultValues: { title: "" } });

  useEffect(() => {
    if (openTarget) {
      form.reset({ title: "" });
    }
  }, [form, openTarget]);

  return (
    <PrettyModalWrap
      open={Boolean(openTarget)}
      onOpenChange={(open) => {
        if (!open) {
          onOpenTargetChange(null);
        }
      }}
      title="Add card"
      description="The create flow only asks for a title. You can add description and priority from the detail panel."
      footer={
        <>
          <BoardActionButton tone="ghost" onPress={() => onOpenTargetChange(null)}>
            Cancel
          </BoardActionButton>
          <BoardActionButton tone="accent" type="submit" form={formId}>
            Create card
          </BoardActionButton>
        </>
      }
    >
      <YStack gap="$3">
        <FormRoot
          id={formId}
          form={form}
          gap="$3"
          onSubmit={async (values) => {
            if (!openTarget) {
              return;
            }
            await onCreate({ ...openTarget, title: values.title });
          }}
        >
          <FormTextField<CreateCardForm, "title">
            name="title"
            label="Title"
            rules={{
              required: "Card title is required.",
              maxLength: { value: 200, message: "Keep the title under 200 characters." },
            }}
            fieldProps={{ gap: "$2" }}
            labelProps={{ fontWeight: "700", color: "$boardHeading" }}
            autoFocus
            backgroundColor="$boardPanelSurfaceStrong"
            defaultBorderColor="$boardShellBorder"
            placeholder="Define launch goals"
          />
        </FormRoot>
      </YStack>
    </PrettyModalWrap>
  );
}

type CreateColumnForm = { title: string };

function CreateColumnModal({
  openTarget,
  onOpenTargetChange,
  onCreate,
  getBoard,
}: Readonly<{
  openTarget: { boardId: string; afterColumnId: string | null } | null;
  onOpenTargetChange: (t: { boardId: string; afterColumnId: string | null } | null) => void;
  onCreate: (input: {
    boardId: string;
    afterColumnId: string | null;
    title: string;
  }) => Promise<void>;
  getBoard: (boardId: string) => LoadedBoard | null;
}>) {
  const formId = useMemo(() => `create-column-${Math.random().toString(36).slice(2)}`, []);
  const form = useForm<CreateColumnForm>({ defaultValues: { title: "" } });

  useEffect(() => {
    if (openTarget) {
      form.reset({ title: "" });
    }
  }, [form, openTarget]);

  return (
    <PrettyModalWrap
      open={Boolean(openTarget)}
      onOpenChange={(open) => {
        if (!open) {
          onOpenTargetChange(null);
        }
      }}
      title="Add column"
      description="Create another workflow lane and place it directly after the chosen column."
      footer={
        <>
          <BoardActionButton tone="ghost" onPress={() => onOpenTargetChange(null)}>
            Cancel
          </BoardActionButton>
          <BoardActionButton tone="accent" type="submit" form={formId}>
            Create column
          </BoardActionButton>
        </>
      }
    >
      <YStack gap="$3">
        <FormRoot
          id={formId}
          form={form}
          gap="$3"
          onSubmit={async (values) => {
            if (!openTarget) {
              return;
            }
            const board = getBoard(openTarget.boardId);
            if (!board) {
              return;
            }
            await onCreate({ ...openTarget, title: values.title });
          }}
        >
          <FormTextField<CreateColumnForm, "title">
            name="title"
            label="Column title"
            rules={{
              required: "Column title is required.",
              maxLength: { value: 80, message: "Keep the title under 80 characters." },
            }}
            fieldProps={{ gap: "$2" }}
            labelProps={{ fontWeight: "700", color: "$boardHeading" }}
            autoFocus
            backgroundColor="$boardPanelSurfaceStrong"
            defaultBorderColor="$boardShellBorder"
            placeholder="Ready"
          />
        </FormRoot>
      </YStack>
    </PrettyModalWrap>
  );
}

function DeleteBoardConfirmModal({
  open,
  boardName,
  isDeleting,
  onOpenChange,
  onConfirm,
}: DeleteBoardModalProps) {
  return (
    <PrettyModalWrap
      open={open}
      onOpenChange={onOpenChange}
      title="Delete board"
      description="This soft-deletes the board. You can still see deleted boards from the boards list."
      footer={
        <>
          <BoardActionButton tone="ghost" disabled={isDeleting} onPress={() => onOpenChange(false)}>
            Cancel
          </BoardActionButton>
          <BoardActionButton tone="danger" disabled={isDeleting} onPress={() => void onConfirm()}>
            {isDeleting ? "Deleting…" : "Delete board"}
          </BoardActionButton>
        </>
      }
    >
      <YStack gap="$3">
        <Text color="$boardTextMuted">
          {boardName
            ? `“${boardName}” will be removed from your active boards. Cards, columns, and subtasks come with it.`
            : "This board will be removed from your active boards. Cards, columns, and subtasks come with it."}
        </Text>
      </YStack>
    </PrettyModalWrap>
  );
}

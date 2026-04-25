import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { DropResult } from "@hello-pangea/dnd";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@tamagui/input";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { PrettyModalWrap } from "../../Modal/PrettyModalWrap";
import { trpc } from "../../trpc/client";
import { tamaguiInputValueOnChange } from "../../tamaguiRhfWebField";
import { BoardShell } from "./BoardShell";
import { BoardCanvas } from "./BoardCanvas";
import { CardDetailSurface } from "./CardDetailSurface";
import {
  boardPriorityMeta,
  canReorderBoard,
  getCardPosition,
  getColumnPosition,
  getNeighborIds,
  parseBoardDetailSearch,
  reorderBoardCards,
  reorderBoardColumns,
  serializePriorityFilter,
  togglePrioritySelection,
} from "./model";
import type { BoardDetailSearch, CardPriority, LoadedBoard } from "./types";
import {
  BoardActionButton,
  BoardInlineNotice,
  BoardLiveRegion,
  BoardStateCard,
  BoardSurface,
  PriorityPill,
} from "./ui";

type CreateCardForm = {
  title: string;
};

type CreateColumnForm = {
  title: string;
};

type RenameBoardForm = {
  name: string;
};

type RawBoardDetailSearch = {
  card?: string;
  view?: BoardDetailSearch["view"];
  groupBy?: BoardDetailSearch["groupBy"];
  priority?: string;
};

export function BoardDetailScreen({
  boardId,
  rawSearch,
}: Readonly<{
  boardId: string;
  rawSearch: RawBoardDetailSearch;
}>) {
  const navigate = useNavigate({ from: "/boards/$boardId" });
  const utils = trpc.useUtils();
  const search = parseBoardDetailSearch(rawSearch as Record<string, unknown>);
  const reorderEnabled = canReorderBoard(search);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [optimisticBoard, setOptimisticBoard] = useState<LoadedBoard | null>(null);
  const [createCardColumnId, setCreateCardColumnId] = useState<string | null>(null);
  const [createColumnAfterId, setCreateColumnAfterId] = useState<string | null | undefined>(
    undefined,
  );
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [confirmBoardDelete, setConfirmBoardDelete] = useState(false);

  const boardQuery = trpc.board.getWithColumnsAndCards.useQuery(
    { boardId },
    {
      retry: false,
    },
  );

  const listQuery = trpc.card.listByBoard.useInfiniteQuery(
    {
      boardId,
      filters: search.priority.length > 0 ? { priority: search.priority } : undefined,
      limit: 30,
    },
    {
      enabled: search.view === "list",
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      retry: false,
    },
  );

  const createCardForm = useForm<CreateCardForm>({
    defaultValues: { title: "" },
  });
  const createColumnForm = useForm<CreateColumnForm>({
    defaultValues: { title: "" },
  });
  const renameBoardForm = useForm<RenameBoardForm>({
    defaultValues: { name: "" },
  });

  const board = optimisticBoard ?? boardQuery.data?.board;

  useEffect(() => {
    setOptimisticBoard(null);
    setConflictMessage(null);
  }, [boardId]);

  useEffect(() => {
    if (createCardColumnId) {
      createCardForm.reset({ title: "" });
    }
  }, [createCardColumnId, createCardForm]);

  useEffect(() => {
    if (createColumnAfterId !== undefined) {
      createColumnForm.reset({ title: "" });
    }
  }, [createColumnAfterId, createColumnForm]);

  useEffect(() => {
    if (boardSettingsOpen && board) {
      renameBoardForm.reset({ name: board.name });
      setConfirmBoardDelete(false);
    }
  }, [board, boardSettingsOpen, renameBoardForm]);

  const refreshBoard = async () => {
    const result = await boardQuery.refetch();
    await utils.board.list.invalidate();
    setOptimisticBoard(null);
    return result;
  };

  const updateRouteSearch = (patch: Partial<RawBoardDetailSearch>) => {
    void navigate({
      params: { boardId },
      search: (previous) => ({
        ...previous,
        ...patch,
      }),
    });
  };

  const handleMutationError = async (message: string) => {
    setOptimisticBoard(null);
    setConflictMessage(message);
    await boardQuery.refetch();
  };

  const createCard = trpc.card.create.useMutation({
    onSuccess: async ({ cardId }) => {
      await Promise.all([refreshBoard(), utils.card.listByBoard.invalidate({ boardId })]);
      setCreateCardColumnId(null);
      setAnnouncement("Card created.");
      updateRouteSearch({ card: cardId });
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const createColumn = trpc.column.create.useMutation({
    onSuccess: async () => {
      await refreshBoard();
      setCreateColumnAfterId(undefined);
      setAnnouncement("Column created.");
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const renameColumn = trpc.column.rename.useMutation({
    onSuccess: async () => {
      await refreshBoard();
      setAnnouncement("Column renamed.");
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const renameBoard = trpc.board.rename.useMutation({
    onSuccess: async () => {
      await refreshBoard();
      setBoardSettingsOpen(false);
      setAnnouncement("Board renamed.");
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const deleteBoard = trpc.board.softDelete.useMutation({
    onSuccess: async () => {
      await utils.board.list.invalidate();
      setAnnouncement("Board deleted.");
      void navigate({
        to: "/boards",
        search: { status: "deleted" },
      });
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const reorderColumn = trpc.column.reorder.useMutation({
    onSuccess: async () => {
      await refreshBoard();
      setAnnouncement("Column moved.");
    },
    onError: async () => {
      await handleMutationError(
        "We couldn’t move that column because the board changed. Refresh and try again.",
      );
    },
  });

  const reorderCard = trpc.card.reorder.useMutation({
    onSuccess: async () => {
      await Promise.all([refreshBoard(), utils.card.listByBoard.invalidate({ boardId })]);
      setAnnouncement("Card moved.");
    },
    onError: async () => {
      await handleMutationError(
        "We couldn’t move that card because the board changed. Refresh and try again.",
      );
    },
  });

  const moveCard = trpc.card.move.useMutation({
    onSuccess: async () => {
      await Promise.all([refreshBoard(), utils.card.listByBoard.invalidate({ boardId })]);
      setAnnouncement("Card moved.");
    },
    onError: async () => {
      await handleMutationError(
        "We couldn’t move that card because the board changed. Refresh and try again.",
      );
    },
  });

  const listItems = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data?.pages],
  );

  const commitColumnPlacement = async (
    currentBoard: LoadedBoard,
    columnId: string,
    destinationIndex: number,
  ) => {
    const location = getColumnPosition(currentBoard, columnId);
    if (!location || location.columnIndex === destinationIndex) {
      return;
    }

    const nextBoard = reorderBoardColumns(currentBoard, location.columnIndex, destinationIndex);
    const movedColumn = nextBoard.columns[destinationIndex];
    if (!movedColumn) {
      return;
    }

    const { prevId, nextId } = getNeighborIds(nextBoard.columns, destinationIndex);
    setOptimisticBoard(nextBoard);
    setConflictMessage(null);

    await reorderColumn.mutateAsync({
      columnId: movedColumn.id,
      prevColumnId: prevId,
      nextColumnId: nextId,
      expectedVersion: movedColumn.version,
    });
  };

  const commitCardPlacement = async (
    currentBoard: LoadedBoard,
    input: {
      cardId: string;
      sourceColumnId: string;
      sourceIndex: number;
      destinationColumnId: string;
      destinationIndex: number;
      expectedVersion: number;
    },
  ) => {
    if (
      input.sourceColumnId === input.destinationColumnId &&
      input.sourceIndex === input.destinationIndex
    ) {
      return;
    }

    const nextBoard = reorderBoardCards(currentBoard, input);
    const destinationColumn = nextBoard.columns.find(
      (column) => column.id === input.destinationColumnId,
    );

    if (!destinationColumn) {
      return;
    }

    const { prevId, nextId } = getNeighborIds(destinationColumn.cards, input.destinationIndex);
    setOptimisticBoard(nextBoard);
    setConflictMessage(null);

    if (input.sourceColumnId === input.destinationColumnId) {
      await reorderCard.mutateAsync({
        cardId: input.cardId,
        columnId: input.destinationColumnId,
        prevCardId: prevId,
        nextCardId: nextId,
        expectedVersion: input.expectedVersion,
      });
      return;
    }

    await moveCard.mutateAsync({
      cardId: input.cardId,
      targetColumnId: input.destinationColumnId,
      prevCardId: prevId,
      nextCardId: nextId,
      expectedVersion: input.expectedVersion,
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!board || !result.destination || !reorderEnabled) {
      return;
    }

    if (result.type === "COLUMN") {
      void commitColumnPlacement(board, result.draggableId, result.destination.index);
      return;
    }

    if (result.type !== "CARD") {
      return;
    }

    if (result.destination.droppableId === "board-columns") {
      return;
    }

    const sourceColumnId = result.source.droppableId;
    const destinationColumnId = result.destination.droppableId;
    const cardLocation = getCardPosition(board, result.draggableId);
    if (!cardLocation) {
      return;
    }

    void commitCardPlacement(board, {
      cardId: result.draggableId,
      sourceColumnId,
      sourceIndex: result.source.index,
      destinationColumnId,
      destinationIndex: result.destination.index,
      expectedVersion: cardLocation.card.version,
    });
  };

  const handleMoveColumn = (columnId: string, direction: "left" | "right") => {
    if (!board || !reorderEnabled) {
      return;
    }

    const location = getColumnPosition(board, columnId);
    if (!location) {
      return;
    }

    const destinationIndex =
      direction === "left"
        ? Math.max(location.columnIndex - 1, 0)
        : Math.min(location.columnIndex + 1, board.columns.length - 1);

    if (destinationIndex === location.columnIndex) {
      return;
    }

    void commitColumnPlacement(board, columnId, destinationIndex);
  };

  const handleMoveCard = (cardId: string, direction: "up" | "down" | "left" | "right") => {
    if (!board || !reorderEnabled) {
      return;
    }

    const location = getCardPosition(board, cardId);
    if (!location) {
      return;
    }

    let destinationColumnId = location.column.id;
    let destinationIndex = location.cardIndex;

    if (direction === "up") {
      destinationIndex = Math.max(location.cardIndex - 1, 0);
    } else if (direction === "down") {
      destinationIndex = Math.min(location.cardIndex + 1, location.column.cards.length - 1);
    } else if (direction === "left") {
      const targetColumn = board.columns[location.columnIndex - 1];
      if (!targetColumn) {
        return;
      }
      destinationColumnId = targetColumn.id;
      destinationIndex = Math.min(location.cardIndex, targetColumn.cards.length);
    } else if (direction === "right") {
      const targetColumn = board.columns[location.columnIndex + 1];
      if (!targetColumn) {
        return;
      }
      destinationColumnId = targetColumn.id;
      destinationIndex = Math.min(location.cardIndex, targetColumn.cards.length);
    }

    void commitCardPlacement(board, {
      cardId,
      sourceColumnId: location.column.id,
      sourceIndex: location.cardIndex,
      destinationColumnId,
      destinationIndex,
      expectedVersion: location.card.version,
    });
  };

  const renderBoardContent = () => {
    if (boardQuery.isLoading && !board) {
      return (
        <BoardStateCard
          title="Loading board"
          description="We’re loading the board structure, card summaries, and current counts now."
        />
      );
    }

    if (boardQuery.error && !board) {
      const code = getErrorCode(boardQuery.error);
      const title = code === "NOT_FOUND" ? "Board not available" : "We couldn’t load this board";
      const description =
        code === "NOT_FOUND"
          ? "This board may have been deleted or may not belong to your account."
          : "Retry the protected board read and we’ll try again.";

      return (
        <BoardStateCard
          title={title}
          description={description}
          actions={
            <BoardActionButton onPress={() => void boardQuery.refetch()}>Retry</BoardActionButton>
          }
        />
      );
    }

    if (!board) {
      return null;
    }

    return (
      <YStack gap="$4">
        <YStack padding="$5" paddingBottom="$0" gap="$4">
          {boardQuery.error ? (
            <BoardInlineNotice
              tone="warning"
              message="The latest board refresh failed. You’re still seeing the last loaded board state."
              actions={
                <BoardActionButton tone="ghost" onPress={() => void boardQuery.refetch()}>
                  Retry refresh
                </BoardActionButton>
              }
            />
          ) : null}

          {conflictMessage ? (
            <BoardInlineNotice
              tone="danger"
              message={conflictMessage}
              actions={
                <BoardActionButton
                  tone="ghost"
                  onPress={() => {
                    void refreshBoard();
                  }}
                >
                  Refresh board
                </BoardActionButton>
              }
            />
          ) : null}

          <BoardControls
            search={search}
            onSetView={(view) => {
              updateRouteSearch({ view });
            }}
            onSetGroupBy={(groupBy) => {
              updateRouteSearch({ groupBy });
              setAnnouncement("Board grouping updated.");
            }}
            onTogglePriority={(priority) => {
              const nextPriority = togglePrioritySelection(search.priority, priority);
              updateRouteSearch({
                priority: serializePriorityFilter(nextPriority),
              });
            }}
            onClearPriority={() => {
              updateRouteSearch({ priority: undefined });
            }}
          />
        </YStack>

        {search.view === "board" ? (
          <YStack paddingBottom="$5">
            <BoardCanvas
              board={board}
              search={search}
              canReorder={reorderEnabled}
              onDragEnd={handleDragEnd}
              onOpenCard={(cardId) => {
                updateRouteSearch({ card: cardId });
              }}
              onOpenCreateCard={(columnId) => {
                setCreateCardColumnId(columnId);
              }}
              onRenameColumn={async (input) => {
                await renameColumn.mutateAsync(input);
              }}
              renamePendingColumnId={
                renameColumn.isPending && renameColumn.variables
                  ? renameColumn.variables.columnId
                  : null
              }
              onOpenCreateColumnAfter={(columnId) => {
                setCreateColumnAfterId(columnId ?? null);
              }}
              onMoveColumn={handleMoveColumn}
              onMoveCard={handleMoveCard}
            />
          </YStack>
        ) : (
          <YStack padding="$5" paddingTop="$0">
            <BoardListMode
              listItems={listItems}
              isLoading={listQuery.isLoading && !listQuery.data}
              isLoadingMore={listQuery.isFetchingNextPage}
              errorMessage={listQuery.error?.message ?? null}
              hasNextPage={Boolean(listQuery.hasNextPage)}
              onLoadMore={() => {
                void listQuery.fetchNextPage();
              }}
              onOpenCard={(cardId) => {
                updateRouteSearch({ card: cardId });
              }}
            />
          </YStack>
        )}
      </YStack>
    );
  };

  const selectedCardId = search.card;

  return (
    <>
      <BoardLiveRegion message={announcement} />
      <BoardShell
        currentBoardId={boardId}
        title={board?.name ?? "Board"}
        subtitle="Plan, filter, regroup, and move work without leaving the board route."
        headerActions={
          <BoardActionButton onPress={() => setBoardSettingsOpen(true)}>
            Board settings
          </BoardActionButton>
        }
        announcement={announcement}
        renderContent={() => renderBoardContent()}
      />

      <CardDetailSurface
        open={Boolean(selectedCardId)}
        cardId={selectedCardId}
        boardId={boardId}
        onOpenChange={(open) => {
          if (!open) {
            updateRouteSearch({ card: undefined });
          }
        }}
        onDeleted={() => {
          updateRouteSearch({ card: undefined });
        }}
        onBoardChanged={refreshBoard}
        onAnnounce={setAnnouncement}
      />

      <PrettyModalWrap
        open={Boolean(createCardColumnId)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateCardColumnId(null);
          }
        }}
        title="Add card"
        description="The create flow only asks for a title. You can add description and priority from the detail panel."
        footer={
          <>
            <BoardActionButton tone="ghost" onPress={() => setCreateCardColumnId(null)}>
              Cancel
            </BoardActionButton>
            <BoardActionButton
              tone="accent"
              disabled={createCard.isPending}
              onPress={createCardForm.handleSubmit(async (values) => {
                if (!createCardColumnId) {
                  return;
                }

                await createCard.mutateAsync({
                  columnId: createCardColumnId,
                  title: values.title,
                });
              })}
            >
              {createCard.isPending ? "Creating…" : "Create card"}
            </BoardActionButton>
          </>
        }
      >
        <YStack gap="$3">
          <YStack tag="label" gap="$2">
            <Text fontWeight="700" color="$boardHeading">
              Title
            </Text>
            <Controller
              control={createCardForm.control}
              name="title"
              rules={{
                required: "Card title is required.",
                maxLength: { value: 200, message: "Keep the title under 200 characters." },
              }}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={tamaguiInputValueOnChange(field.onChange)}
                  onBlur={field.onBlur}
                  autoFocus
                  backgroundColor="$boardPanelSurfaceStrong"
                  borderColor="$boardShellBorder"
                  placeholder="Define launch goals"
                />
              )}
            />
          </YStack>
          {createCardForm.formState.errors.title ? (
            <Text color="$boardDangerText">{createCardForm.formState.errors.title.message}</Text>
          ) : null}
          {createCard.error ? (
            <Text color="$boardDangerText">{createCard.error.message}</Text>
          ) : null}
        </YStack>
      </PrettyModalWrap>

      <PrettyModalWrap
        open={createColumnAfterId !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setCreateColumnAfterId(undefined);
          }
        }}
        title="Add column"
        description="Create another workflow lane and place it directly after the chosen column."
        footer={
          <>
            <BoardActionButton tone="ghost" onPress={() => setCreateColumnAfterId(undefined)}>
              Cancel
            </BoardActionButton>
            <BoardActionButton
              tone="accent"
              disabled={createColumn.isPending}
              onPress={createColumnForm.handleSubmit(async (values) => {
                const activeBoard = board;
                if (!activeBoard) {
                  return;
                }

                const previousColumn =
                  createColumnAfterId === null
                    ? activeBoard.columns[activeBoard.columns.length - 1]
                    : activeBoard.columns.find((column) => column.id === createColumnAfterId);
                const previousIndex = previousColumn
                  ? activeBoard.columns.findIndex((column) => column.id === previousColumn.id)
                  : -1;
                const nextColumn =
                  previousIndex >= 0
                    ? activeBoard.columns[previousIndex + 1]
                    : activeBoard.columns[0];

                await createColumn.mutateAsync({
                  boardId,
                  title: values.title,
                  prevColumnId: previousColumn?.id ?? null,
                  nextColumnId: nextColumn?.id ?? null,
                });
              })}
            >
              {createColumn.isPending ? "Creating…" : "Create column"}
            </BoardActionButton>
          </>
        }
      >
        <YStack gap="$3">
          <YStack tag="label" gap="$2">
            <Text fontWeight="700" color="$boardHeading">
              Column title
            </Text>
            <Controller
              control={createColumnForm.control}
              name="title"
              rules={{
                required: "Column title is required.",
                maxLength: { value: 80, message: "Keep the title under 80 characters." },
              }}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={tamaguiInputValueOnChange(field.onChange)}
                  onBlur={field.onBlur}
                  autoFocus
                  backgroundColor="$boardPanelSurfaceStrong"
                  borderColor="$boardShellBorder"
                  placeholder="Review"
                />
              )}
            />
          </YStack>
          {createColumnForm.formState.errors.title ? (
            <Text color="$boardDangerText">{createColumnForm.formState.errors.title.message}</Text>
          ) : null}
          {createColumn.error ? (
            <Text color="$boardDangerText">{createColumn.error.message}</Text>
          ) : null}
        </YStack>
      </PrettyModalWrap>

      <PrettyModalWrap
        open={boardSettingsOpen}
        onOpenChange={setBoardSettingsOpen}
        title="Board settings"
        description="Rename the board or delete it entirely."
        footer={
          <>
            <BoardActionButton tone="ghost" onPress={() => setBoardSettingsOpen(false)}>
              Close
            </BoardActionButton>
            <BoardActionButton
              tone="accent"
              disabled={renameBoard.isPending}
              onPress={renameBoardForm.handleSubmit(async (values) => {
                await renameBoard.mutateAsync({
                  boardId,
                  name: values.name,
                });
              })}
            >
              {renameBoard.isPending ? "Saving…" : "Save board name"}
            </BoardActionButton>
          </>
        }
      >
        <YStack gap="$4">
          <YStack tag="label" gap="$2">
            <Text fontWeight="700" color="$boardHeading">
              Board name
            </Text>
            <Controller
              control={renameBoardForm.control}
              name="name"
              rules={{
                required: "Board name is required.",
                maxLength: { value: 80, message: "Keep the board name under 80 characters." },
              }}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={tamaguiInputValueOnChange(field.onChange)}
                  onBlur={field.onBlur}
                  autoFocus
                  backgroundColor="$boardPanelSurfaceStrong"
                  borderColor="$boardShellBorder"
                />
              )}
            />
          </YStack>
          {renameBoard.error ? (
            <Text color="$boardDangerText">{renameBoard.error.message}</Text>
          ) : null}

          <BoardSurface padding="$4">
            <YStack gap="$3">
              <Text fontWeight="700" color="$boardHeading">
                Delete board
              </Text>
              <Text color="$boardTextMuted">
                Deleting a board removes its columns, cards, and subtasks from the active workspace.
              </Text>
              {confirmBoardDelete ? (
                <BoardInlineNotice
                  tone="danger"
                  message="Delete is armed. Press the button again to confirm."
                />
              ) : null}
              <BoardActionButton
                tone={confirmBoardDelete ? "danger" : "ghost"}
                disabled={deleteBoard.isPending}
                onPress={() => {
                  if (!confirmBoardDelete) {
                    setConfirmBoardDelete(true);
                    return;
                  }

                  void deleteBoard.mutateAsync({ boardId });
                }}
              >
                {deleteBoard.isPending
                  ? "Deleting…"
                  : confirmBoardDelete
                    ? "Confirm delete board"
                    : "Delete board"}
              </BoardActionButton>
            </YStack>
          </BoardSurface>
        </YStack>
      </PrettyModalWrap>
    </>
  );
}

function BoardControls({
  search,
  onSetView,
  onSetGroupBy,
  onTogglePriority,
  onClearPriority,
}: Readonly<{
  search: BoardDetailSearch;
  onSetView: (view: BoardDetailSearch["view"]) => void;
  onSetGroupBy: (groupBy: BoardDetailSearch["groupBy"]) => void;
  onTogglePriority: (priority: CardPriority) => void;
  onClearPriority: () => void;
}>) {
  return (
    <BoardSurface padding="$4">
      <YStack gap="$3">
        <XStack gap="$3" flexWrap="wrap" alignItems="center">
          <Text fontWeight="700" color="$boardHeading">
            View
          </Text>
          <BoardActionButton
            tone={search.view === "board" ? "accent" : "ghost"}
            onPress={() => onSetView("board")}
          >
            Board
          </BoardActionButton>
          <BoardActionButton
            tone={search.view === "list" ? "accent" : "ghost"}
            onPress={() => onSetView("list")}
          >
            List
          </BoardActionButton>

          {search.view === "board" ? (
            <>
              <Text fontWeight="700" color="$boardHeading">
                Group by
              </Text>
              <BoardActionButton
                tone={search.groupBy === "column" ? "accent" : "ghost"}
                onPress={() => onSetGroupBy("column")}
              >
                Column
              </BoardActionButton>
              <BoardActionButton
                tone={search.groupBy === "priority" ? "accent" : "ghost"}
                onPress={() => onSetGroupBy("priority")}
              >
                Priority
              </BoardActionButton>
            </>
          ) : null}
        </XStack>

        <YStack gap="$2">
          <XStack gap="$2" flexWrap="wrap" alignItems="center">
            <Text fontWeight="700" color="$boardHeading">
              Priority filter
            </Text>
            {(["none", "low", "medium", "high"] as const).map((priority) => {
              const meta = boardPriorityMeta[priority];
              const active = search.priority.includes(priority);

              return (
                <BoardActionButton
                  key={priority}
                  tone={active ? "accent" : "ghost"}
                  onPress={() => onTogglePriority(priority)}
                >
                  {meta.label}
                </BoardActionButton>
              );
            })}
            {search.priority.length > 0 ? (
              <BoardActionButton tone="ghost" onPress={onClearPriority}>
                Clear filters
              </BoardActionButton>
            ) : null}
          </XStack>
        </YStack>
      </YStack>
    </BoardSurface>
  );
}

function BoardListMode({
  listItems,
  isLoading,
  isLoadingMore,
  errorMessage,
  hasNextPage,
  onLoadMore,
  onOpenCard,
}: Readonly<{
  listItems: Array<{
    id: string;
    title: string;
    description: string;
    priority: CardPriority;
    columnTitle: string;
  }>;
  isLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onOpenCard: (cardId: string) => void;
}>) {
  if (isLoading) {
    return (
      <BoardStateCard
        title="Loading matching cards"
        description="We’re building the flat list view for the current board filters."
      />
    );
  }

  if (errorMessage && listItems.length === 0) {
    return (
      <BoardStateCard title="We couldn’t load the matching cards" description={errorMessage} />
    );
  }

  if (listItems.length === 0) {
    return (
      <BoardStateCard
        title="No matching cards"
        description="Adjust the active priority filters or switch back to board view to continue."
      />
    );
  }

  return (
    <YStack gap="$3">
      {errorMessage ? <BoardInlineNotice tone="warning" message={errorMessage} /> : null}
      {listItems.map((card) => (
        <BoardSurface key={card.id} padding="$4">
          <YStack gap="$3">
            <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
              <YStack gap="$1" flex={1}>
                <Text fontWeight="700" color="$boardHeading">
                  {card.title}
                </Text>
                <Text color="$boardTextMuted">{card.columnTitle}</Text>
              </YStack>
              <PriorityPill priority={card.priority} />
            </XStack>
            <Text color="$boardTextMuted">
              {card.description || "No description yet. Open the card to add more detail."}
            </Text>
            <BoardActionButton tone="ghost" onPress={() => onOpenCard(card.id)}>
              Open card
            </BoardActionButton>
          </YStack>
        </BoardSurface>
      ))}

      {hasNextPage ? (
        <BoardActionButton tone="accent" onPress={onLoadMore}>
          {isLoadingMore ? "Loading more…" : "Load more"}
        </BoardActionButton>
      ) : null}
    </YStack>
  );
}

function getErrorCode(error: unknown) {
  const maybeError = error as {
    data?: { code?: string };
    shape?: { data?: { code?: string } };
  };

  return maybeError.data?.code ?? maybeError.shape?.data?.code ?? null;
}

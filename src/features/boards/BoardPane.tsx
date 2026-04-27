import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMedia } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import {
  selectGroupedBoardReorderEnabled,
  setGroupedBoardReorderEnabled,
} from "../../store/board-grouping-preferences-slice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { trpc } from "../../trpc/client";
import { BoardCanvas } from "./BoardCanvas";
import { BoardListMode } from "./BoardListMode";
import { canReorderBoard, getCardPosition, getColumnPosition, getNeighborIds } from "./model";
import { getCardSlice } from "./columnCards/cardSlice";
import { patchSliceCache } from "./columnCards/patchCache";
import { keyBetween } from "../../lib/ordering/key-between";
import { BoardControlsPanel } from "./BoardControlsPanel";
import type { CardTagsRowTag } from "./BoardCanvas/CardTagsRow";
import type { BoardDetailSearch, CardPriority, LoadedBoard, LoadedBoardStructure } from "./types";
import { BoardActionButton, BoardInlineNotice, BoardStateCard } from "./ui";
import type { BoardMutations } from "./useBoardMutations";
import type { SensorAPI } from "@hello-pangea/dnd";
import type { RefObject } from "react";

type BoardPaneProps = {
  boardId: string;
  boardKey: "main" | "drawer";
  search: BoardDetailSearch;
  role: "main" | "drawer";
  programmaticSensorApiRef?: RefObject<SensorAPI | null>;
  /** The synthesized board (structure + slice items). Null while loading. */
  board: LoadedBoard | null;
  /** Underlying structure query, used to surface errors and a refetch action. */
  structureQuery: ReturnType<typeof trpc.board.getStructure.useQuery>;
  state: {
    optimisticStructure: LoadedBoardStructure | null;
    setOptimisticStructure: (s: LoadedBoardStructure | null) => void;
    conflictMessage: string | null;
    setConflictMessage: (m: string | null) => void;
  };
  mutations: BoardMutations;
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onAddTag: (input: { cardId: string; name: string }) => Promise<void>;
  onDetachTag: (input: { cardId: string; tagId: string }) => Promise<void>;
  onOpenCard: (cardId: string) => void;
  onOpenCreateCard: (boardId: string, columnId: string) => void;
  onOpenCreateColumn: (boardId: string, afterColumnId: string | null) => void;
  bottomScrollPadding?: number;
  onSetView?: (view: BoardDetailSearch["view"]) => void;
  onSetGroupBy?: (groupBy: BoardDetailSearch["groupBy"]) => void;
  onTogglePriority?: (priority: CardPriority) => void;
  onClearPriority?: () => void;
  paginationByColumn?: Readonly<
    Record<string, { hasNextPage: boolean; onLoadMore: () => void } | undefined>
  >;
};

export function BoardPane({
  boardId,
  boardKey,
  search,
  role,
  programmaticSensorApiRef,
  board,
  structureQuery,
  state,
  mutations,
  availableTags,
  onAddTag,
  onDetachTag,
  onOpenCard,
  onOpenCreateCard,
  onOpenCreateColumn,
  bottomScrollPadding,
  onSetView,
  onSetGroupBy,
  onTogglePriority,
  onClearPriority,
  paginationByColumn,
}: Readonly<BoardPaneProps>) {
  const media = useMedia();
  const dispatch = useAppDispatch();
  const groupedBoardReorderPreference = useAppSelector(selectGroupedBoardReorderEnabled);
  const queryClient = useQueryClient();

  const columnReorderEnabled = canReorderBoard(search);
  const groupedBoardReorderEnabled =
    search.view === "board" &&
    (search.groupBy !== "column" || search.priority.length > 0) &&
    groupedBoardReorderPreference;
  const priorityGroupReorderEnabled =
    search.view === "board" && search.groupBy === "priority" && groupedBoardReorderEnabled;

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

  const listItems = useMemo(() => {
    return listQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [listQuery.data?.pages]);

  const refreshBoard = async () => {
    await mutations.refreshBoard();
  };

  const commitColumnPlacement = async (
    currentBoard: LoadedBoard,
    columnId: string,
    destinationIndex: number,
  ) => {
    const location = getColumnPosition(currentBoard, columnId);
    if (!location) {
      return;
    }
    if (destinationIndex === location.columnIndex) {
      return;
    }
    const reorderedColumns = [...currentBoard.columns];
    const [moved] = reorderedColumns.splice(location.columnIndex, 1);
    if (!moved) {
      return;
    }
    reorderedColumns.splice(destinationIndex, 0, moved);
    const movedColumn = reorderedColumns[destinationIndex];
    if (!movedColumn) {
      return;
    }
    const { prevId, nextId } = getNeighborIds(reorderedColumns, destinationIndex);
    state.setOptimisticStructure({
      id: currentBoard.id,
      name: currentBoard.name,
      updatedAt: currentBoard.updatedAt,
      columns: reorderedColumns.map((column) => ({
        id: column.id,
        title: column.title,
        position: column.position,
        version: column.version,
      })),
    });
    state.setConflictMessage(null);
    await mutations.reorderColumn.mutateAsync({
      columnId: movedColumn.id,
      prevColumnId: prevId,
      nextColumnId: nextId,
      expectedVersion: movedColumn.version,
    });
  };

  const commitCardPlacement = async (
    currentBoard: LoadedBoard,
    placement: {
      cardId: string;
      sourceColumnId: string;
      sourceIndex: number;
      destinationColumnId: string;
      destinationIndex: number;
      destinationPriority?: CardPriority;
      expectedVersion: number;
    },
  ) => {
    const currentLocation = getCardPosition(currentBoard, placement.cardId);
    if (!currentLocation) {
      return;
    }
    const currentPriority = currentLocation.card.priority;
    if (
      placement.sourceColumnId === placement.destinationColumnId &&
      placement.sourceIndex === placement.destinationIndex &&
      (!placement.destinationPriority || placement.destinationPriority === currentPriority)
    ) {
      return;
    }

    const destinationColumn = currentBoard.columns.find(
      (column) => column.id === placement.destinationColumnId,
    );
    if (!destinationColumn) {
      return;
    }

    const cardsWithoutMoved = destinationColumn.cards.filter(
      (card) => card.id !== placement.cardId,
    );
    const prevCard = cardsWithoutMoved[placement.destinationIndex - 1] ?? null;
    const nextCard = cardsWithoutMoved[placement.destinationIndex] ?? null;
    const optimisticPosition = keyBetween(prevCard?.position ?? null, nextCard?.position ?? null);

    const sourceSlice = getCardSlice(placement.sourceColumnId, currentPriority, search);
    const destinationPriority = placement.destinationPriority ?? currentPriority;
    const destinationSlice = getCardSlice(
      placement.destinationColumnId,
      destinationPriority,
      search,
    );

    patchSliceCache(queryClient, sourceSlice, {
      type: "remove",
      cardId: placement.cardId,
    });
    patchSliceCache(queryClient, destinationSlice, {
      type: "insert",
      card: {
        id: currentLocation.card.id,
        columnId: placement.destinationColumnId,
        title: currentLocation.card.title,
        description: currentLocation.card.description,
        priority: destinationPriority,
        position: optimisticPosition,
        version: currentLocation.card.version,
        tags: currentLocation.card.tags,
      },
    });
    state.setConflictMessage(null);

    if (placement.sourceColumnId === placement.destinationColumnId) {
      await mutations.reorderCard.mutateAsync({
        cardId: placement.cardId,
        columnId: placement.destinationColumnId,
        priority: placement.destinationPriority,
        prevCardId: prevCard?.id ?? null,
        nextCardId: nextCard?.id ?? null,
        expectedVersion: placement.expectedVersion,
      });
      return;
    }

    await mutations.moveCard.mutateAsync({
      cardId: placement.cardId,
      targetColumnId: placement.destinationColumnId,
      priority: placement.destinationPriority,
      prevCardId: prevCard?.id ?? null,
      nextCardId: nextCard?.id ?? null,
      expectedVersion: placement.expectedVersion,
    });
  };

  if (structureQuery.isLoading && !structureQuery.data) {
    return (
      <YStack padding="$5" flex={1} minHeight={0}>
        <BoardStateCard
          title="Loading board"
          description="We’re fetching this board’s columns and cards."
        />
      </YStack>
    );
  }

  if (structureQuery.isError && !structureQuery.data) {
    return (
      <YStack padding="$5" flex={1} minHeight={0}>
        <BoardStateCard
          title="We couldn’t load this board"
          description={structureQuery.error.message}
          actions={
            <BoardActionButton onPress={() => void structureQuery.refetch()}>
              Retry
            </BoardActionButton>
          }
        />
      </YStack>
    );
  }

  if (!board) {
    return null;
  }

  const showInlineBoardControls = role === "main" && !media.maxMd;
  const showTopControls =
    Boolean(structureQuery.error) || Boolean(state.conflictMessage) || showInlineBoardControls;

  return (
    <YStack gap="$0" flex={1} minHeight={0} overflow="hidden">
      {showTopControls ? (
        <YStack padding="$5" paddingBottom="$0" gap="$4" flexShrink={0}>
          {structureQuery.error ? (
            <BoardInlineNotice
              tone="warning"
              message="The latest board refresh failed. You’re still seeing the last loaded board state."
              actions={
                <BoardActionButton tone="ghost" onPress={() => void structureQuery.refetch()}>
                  Retry refresh
                </BoardActionButton>
              }
            />
          ) : null}

          {state.conflictMessage ? (
            <BoardInlineNotice
              tone="danger"
              message={state.conflictMessage}
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

          {showInlineBoardControls ? (
            <BoardControlsPanel
              search={search}
              onSetView={(view) => onSetView?.(view)}
              onSetGroupBy={(groupBy) => onSetGroupBy?.(groupBy)}
              onTogglePriority={(priority) => onTogglePriority?.(priority)}
              onClearPriority={() => onClearPriority?.()}
            />
          ) : null}
        </YStack>
      ) : null}

      {search.view === "board" ? (
        <YStack paddingTop={showTopControls ? "$4" : "$0"} flex={1} minHeight={0} overflow="hidden">
          <BoardCanvas
            board={board}
            search={search}
            canReorder={columnReorderEnabled}
            groupedBoardReorderEnabled={groupedBoardReorderEnabled}
            onToggleGroupedBoardReorderEnabled={(enabled) => {
              dispatch(setGroupedBoardReorderEnabled(enabled));
            }}
            onDragEnd={() => {
              // DragDropContext lives at BoardWorkspaceScreen and routes through useDualBoardDnd.
            }}
            onOpenCard={onOpenCard}
            onOpenCreateCard={(columnId) => onOpenCreateCard(boardId, columnId)}
            onRenameCardTitle={async (input) => {
              await mutations.updateCard.mutateAsync({
                cardId: input.cardId,
                title: input.title,
                description: input.description,
                priority: input.priority,
                expectedVersion: input.expectedVersion,
              });
            }}
            onRenameColumn={async (input) => {
              await mutations.renameColumn.mutateAsync(input);
            }}
            renamePendingColumnId={
              mutations.renameColumn.isPending && mutations.renameColumn.variables
                ? mutations.renameColumn.variables.columnId
                : null
            }
            onOpenCreateColumnAfter={(columnId) => onOpenCreateColumn(boardId, columnId ?? null)}
            onMoveColumn={(columnId, direction) => {
              if (!board || (!columnReorderEnabled && !priorityGroupReorderEnabled)) {
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
            }}
            onMoveCard={(cardId, direction) => {
              if (!board) {
                return;
              }
              const location = getCardPosition(board, cardId);
              if (!location) {
                return;
              }
              if (direction === "up" || direction === "down") {
                const delta = direction === "up" ? -1 : 1;
                const destinationIndex = location.cardIndex + delta;
                if (destinationIndex < 0 || destinationIndex >= location.column.cards.length) {
                  return;
                }
                void commitCardPlacement(board, {
                  cardId,
                  sourceColumnId: location.column.id,
                  sourceIndex: location.cardIndex,
                  destinationColumnId: location.column.id,
                  destinationIndex,
                  expectedVersion: location.card.version,
                });
                return;
              }
            }}
            onMovePriorityGroupCard={(cardId, priority, direction) => {
              void cardId;
              void priority;
              void direction;
            }}
            programmaticSensorApiRef={programmaticSensorApiRef}
            dndScopeKey={boardKey}
            bottomScrollPadding={bottomScrollPadding}
            wrapDragDropContext={false}
            availableTags={availableTags}
            onAddTag={onAddTag}
            onDetachTag={onDetachTag}
            paginationByColumn={paginationByColumn}
          />
        </YStack>
      ) : (
        <YStack
          padding="$5"
          paddingTop="$4"
          paddingBottom="$5"
          flex={1}
          minHeight={0}
          overflow="scroll"
        >
          <BoardListMode
            listItems={listItems.map((card) => ({
              id: card.id,
              title: card.title,
              description: card.description,
              priority: card.priority,
              columnTitle: card.columnTitle,
            }))}
            isLoading={listQuery.isLoading && !listQuery.data}
            isLoadingMore={listQuery.isFetchingNextPage}
            errorMessage={listQuery.error?.message ?? null}
            hasNextPage={Boolean(listQuery.hasNextPage)}
            onLoadMore={() => {
              void listQuery.fetchNextPage();
            }}
            onOpenCard={onOpenCard}
          />
        </YStack>
      )}
    </YStack>
  );
}

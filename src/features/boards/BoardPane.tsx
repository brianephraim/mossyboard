import { useMemo } from "react";
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
import {
  getFilteredColumnPlacement,
  getPriorityGroupPlacement,
  parsePriorityGroupDroppableId,
} from "./priorityGrouping";
import { BoardControlsPanel } from "./BoardControlsPanel";
import type { CardTagsRowTag } from "./BoardCanvas/CardTagsRow";
import type { BoardDetailSearch, CardPriority, LoadedBoard } from "./types";
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
  boardQuery: ReturnType<typeof trpc.board.getWithColumnsAndCards.useQuery>;
  state: {
    optimisticBoard: LoadedBoard | null;
    setOptimisticBoard: (b: LoadedBoard | null) => void;
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
};

export function BoardPane({
  boardId,
  boardKey,
  search,
  role,
  programmaticSensorApiRef,
  boardQuery,
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
}: Readonly<BoardPaneProps>) {
  const media = useMedia();
  const dispatch = useAppDispatch();
  const groupedBoardReorderPreference = useAppSelector(selectGroupedBoardReorderEnabled);

  const board =
    state.optimisticBoard ?? (boardQuery.data as { board: LoadedBoard } | undefined)?.board ?? null;
  const columnReorderEnabled = canReorderBoard(search);
  const groupedBoardReorderEnabled =
    search.view === "board" &&
    (search.groupBy !== "column" || search.priority.length > 0) &&
    groupedBoardReorderPreference;
  const priorityGroupReorderEnabled =
    search.view === "board" && search.groupBy === "priority" && groupedBoardReorderEnabled;
  const filteredColumnReorderEnabled =
    search.view === "board" &&
    search.groupBy === "column" &&
    search.priority.length > 0 &&
    groupedBoardReorderEnabled;

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
    state.setOptimisticBoard(null);
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
    const nextBoard = {
      ...currentBoard,
      columns: [...currentBoard.columns],
    };
    const [moved] = nextBoard.columns.splice(location.columnIndex, 1);
    if (!moved) {
      return;
    }
    nextBoard.columns.splice(destinationIndex, 0, moved);
    const movedColumn = nextBoard.columns[destinationIndex];
    if (!movedColumn) {
      return;
    }
    const { prevId, nextId } = getNeighborIds(nextBoard.columns, destinationIndex);
    state.setOptimisticBoard(nextBoard);
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
    input: {
      cardId: string;
      sourceColumnId: string;
      sourceIndex: number;
      destinationColumnId: string;
      destinationIndex: number;
      destinationPriority?: CardPriority;
      expectedVersion: number;
    },
  ) => {
    const currentLocation = getCardPosition(currentBoard, input.cardId);
    const currentPriority = currentLocation?.card.priority;
    if (
      input.sourceColumnId === input.destinationColumnId &&
      input.sourceIndex === input.destinationIndex &&
      (!input.destinationPriority || input.destinationPriority === currentPriority)
    ) {
      return;
    }

    const nextColumns = currentBoard.columns.map((column) => ({
      ...column,
      cards: [...column.cards],
    }));
    const sourceColumn = nextColumns.find((column) => column.id === input.sourceColumnId);
    const destinationColumn = nextColumns.find((column) => column.id === input.destinationColumnId);
    if (!sourceColumn || !destinationColumn) {
      return;
    }
    const [movedCard] = sourceColumn.cards.splice(input.sourceIndex, 1);
    if (!movedCard) {
      return;
    }
    destinationColumn.cards.splice(input.destinationIndex, 0, {
      ...movedCard,
      columnId: destinationColumn.id,
      priority: input.destinationPriority ?? movedCard.priority,
    });
    const nextBoard = { ...currentBoard, columns: nextColumns };
    const { prevId, nextId } = getNeighborIds(destinationColumn.cards, input.destinationIndex);
    state.setOptimisticBoard(nextBoard);
    state.setConflictMessage(null);

    if (input.sourceColumnId === input.destinationColumnId) {
      await mutations.reorderCard.mutateAsync({
        cardId: input.cardId,
        columnId: input.destinationColumnId,
        priority: input.destinationPriority,
        prevCardId: prevId,
        nextCardId: nextId,
        expectedVersion: input.expectedVersion,
      });
      return;
    }

    await mutations.moveCard.mutateAsync({
      cardId: input.cardId,
      targetColumnId: input.destinationColumnId,
      priority: input.destinationPriority,
      prevCardId: prevId,
      nextCardId: nextId,
      expectedVersion: input.expectedVersion,
    });
  };

  const handleDragEnd = (result: import("@hello-pangea/dnd").DropResult) => {
    if (!board || !result.destination) {
      return;
    }
    const src = result.source.droppableId;
    const dst = result.destination.droppableId;
    const scopedSrc = src.startsWith(`${boardKey}::`) ? src.slice(`${boardKey}::`.length) : src;
    const scopedDst = dst.startsWith(`${boardKey}::`) ? dst.slice(`${boardKey}::`.length) : dst;
    const scopedDraggable = result.draggableId.startsWith(`${boardKey}::`)
      ? result.draggableId.slice(`${boardKey}::`.length)
      : result.draggableId;

    const sourcePriorityGroup = parsePriorityGroupDroppableId(scopedSrc);
    const destinationPriorityGroup = parsePriorityGroupDroppableId(scopedDst);

    if (priorityGroupReorderEnabled && sourcePriorityGroup && destinationPriorityGroup) {
      if (src === dst && result.source.index === result.destination.index) {
        return;
      }

      const cardLocation = getCardPosition(board, scopedDraggable);
      if (!cardLocation) {
        return;
      }

      const placement = getPriorityGroupPlacement(board, {
        cardId: scopedDraggable,
        columnId: destinationPriorityGroup.columnId,
        priority: destinationPriorityGroup.priority,
        destinationIndex: result.destination.index,
      });
      if (!placement) {
        return;
      }

      void commitCardPlacement(board, {
        cardId: scopedDraggable,
        sourceColumnId: cardLocation.column.id,
        sourceIndex: cardLocation.cardIndex,
        destinationColumnId: placement.columnId,
        destinationIndex: placement.destinationIndex,
        destinationPriority: destinationPriorityGroup.priority,
        expectedVersion: cardLocation.card.version,
      });
      return;
    }

    if (filteredColumnReorderEnabled && result.type === "CARD") {
      if (src === dst && result.source.index === result.destination.index) {
        return;
      }
      if (scopedDst === "board-columns") {
        return;
      }
      const cardLocation = getCardPosition(board, scopedDraggable);
      if (!cardLocation) {
        return;
      }
      const placement = getFilteredColumnPlacement(board, {
        cardId: scopedDraggable,
        columnId: scopedDst,
        priority: search.priority,
        destinationIndex: result.destination.index,
      });
      if (!placement) {
        return;
      }
      void commitCardPlacement(board, {
        cardId: scopedDraggable,
        sourceColumnId: cardLocation.column.id,
        sourceIndex: cardLocation.cardIndex,
        destinationColumnId: placement.columnId,
        destinationIndex: placement.destinationIndex,
        expectedVersion: cardLocation.card.version,
      });
      return;
    }

    if (result.type === "COLUMN") {
      if (!columnReorderEnabled && !priorityGroupReorderEnabled) {
        return;
      }
      void commitColumnPlacement(board, scopedDraggable, result.destination.index);
      return;
    }

    if (!columnReorderEnabled || result.type !== "CARD") {
      return;
    }
    if (scopedDst === "board-columns") {
      return;
    }
    const cardLocation = getCardPosition(board, scopedDraggable);
    if (!cardLocation) {
      return;
    }
    void commitCardPlacement(board, {
      cardId: scopedDraggable,
      sourceColumnId: scopedSrc,
      sourceIndex: result.source.index,
      destinationColumnId: scopedDst,
      destinationIndex: result.destination.index,
      expectedVersion: cardLocation.card.version,
    });
  };

  if (boardQuery.isLoading && !boardQuery.data) {
    return (
      <YStack padding="$5" flex={1} minHeight={0}>
        <BoardStateCard
          title="Loading board"
          description="We’re fetching this board’s columns and cards."
        />
      </YStack>
    );
  }

  if (boardQuery.isError && !boardQuery.data) {
    return (
      <YStack padding="$5" flex={1} minHeight={0}>
        <BoardStateCard
          title="We couldn’t load this board"
          description={boardQuery.error.message}
          actions={
            <BoardActionButton onPress={() => void boardQuery.refetch()}>Retry</BoardActionButton>
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
    Boolean(boardQuery.error) || Boolean(state.conflictMessage) || showInlineBoardControls;

  return (
    <YStack gap="$0" flex={1} minHeight={0} overflow="hidden">
      {showTopControls ? (
        <YStack padding="$5" paddingBottom="$0" gap="$4" flexShrink={0}>
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
            onDragEnd={handleDragEnd}
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

import type { DropResult } from "@hello-pangea/dnd";
import type { QueryClient } from "@tanstack/react-query";

import { keyBetween } from "../../lib/ordering/key-between";
import { trpc } from "../../trpc/client";
import { getCardSlice } from "./columnCards/cardSlice";
import { patchSliceCache } from "./columnCards/patchCache";
import { getCardPosition, getColumnPosition, getNeighborIds } from "./model";
import {
  getFilteredColumnPlacement,
  getPriorityGroupPlacement,
  parsePriorityGroupDroppableId,
} from "./priorityGrouping";
import type { BoardDetailSearch, CardPriority, LoadedBoard, LoadedBoardStructure } from "./types";
import type { BoardMutations } from "./useBoardMutations";

export type BoardKey = "main" | "drawer";

export function scopeId(boardKey: BoardKey, id: string) {
  return `${boardKey}::${id}`;
}

export function parseScopedId(id: string): { boardKey: BoardKey; id: string } | null {
  const [prefix, ...rest] = id.split("::");
  const scopedId = rest.join("::");
  if ((prefix !== "main" && prefix !== "drawer") || !scopedId) {
    return null;
  }
  return { boardKey: prefix, id: scopedId };
}

type Pane = {
  boardKey: BoardKey;
  boardId: string;
  board: LoadedBoard | null;
  state: {
    setOptimisticStructure: (s: LoadedBoardStructure | null) => void;
    setConflictMessage: (m: string | null) => void;
  };
  mutations: BoardMutations;
};

export function useDualBoardDnd(input: {
  search: BoardDetailSearch;
  main: Pane;
  drawer: Pane | null;
  utils: ReturnType<typeof trpc.useUtils>;
  queryClient: QueryClient;
  setAnnouncement: (m: string | null) => void;
}) {
  const getPane = (key: BoardKey) => {
    if (key === "main") {
      return input.main;
    }
    if (input.drawer && input.drawer.boardKey === "drawer") {
      return input.drawer;
    }
    return null;
  };

  const clearOptimisticStructureBoth = () => {
    input.main.state.setOptimisticStructure(null);
    if (input.drawer) {
      input.drawer.state.setOptimisticStructure(null);
    }
  };

  const refetchBoth = async () => {
    await Promise.all([
      input.main.mutations.refreshBoard(),
      input.drawer ? input.drawer.mutations.refreshBoard() : Promise.resolve(),
    ]);
  };

  const commitColumnPlacement = async (pane: Pane, columnId: string, destinationIndex: number) => {
    const currentBoard = pane.board;
    if (!currentBoard) {
      return;
    }
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
    pane.state.setOptimisticStructure({
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
    pane.state.setConflictMessage(null);
    await pane.mutations.reorderColumn.mutateAsync({
      columnId: movedColumn.id,
      prevColumnId: prevId,
      nextColumnId: nextId,
      expectedVersion: movedColumn.version,
    });
  };

  const commitCardPlacement = async (
    pane: Pane,
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

    const sourceSlice = getCardSlice(placement.sourceColumnId, currentPriority, input.search);
    const destinationPriority = placement.destinationPriority ?? currentPriority;
    const destinationSlice = getCardSlice(
      placement.destinationColumnId,
      destinationPriority,
      input.search,
    );

    patchSliceCache(input.queryClient, sourceSlice, {
      type: "remove",
      cardId: placement.cardId,
    });
    patchSliceCache(input.queryClient, destinationSlice, {
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
    pane.state.setConflictMessage(null);

    if (placement.sourceColumnId === placement.destinationColumnId) {
      await pane.mutations.reorderCard.mutateAsync({
        cardId: placement.cardId,
        columnId: placement.destinationColumnId,
        priority: placement.destinationPriority,
        prevCardId: prevCard?.id ?? null,
        nextCardId: nextCard?.id ?? null,
        expectedVersion: placement.expectedVersion,
      });
      return;
    }

    await pane.mutations.moveCard.mutateAsync({
      cardId: placement.cardId,
      targetColumnId: placement.destinationColumnId,
      priority: placement.destinationPriority,
      prevCardId: prevCard?.id ?? null,
      nextCardId: nextCard?.id ?? null,
      expectedVersion: placement.expectedVersion,
    });
  };

  const commitCrossBoardMove = async (from: Pane, to: Pane, result: DropResult) => {
    if (!from.board || !to.board || !result.destination) {
      return;
    }

    if (result.destination.droppableId === scopeId(to.boardKey, "board-columns")) {
      return;
    }

    const cardId = parseScopedId(result.draggableId)?.id;
    if (!cardId) {
      return;
    }

    const sourceLocation = getCardPosition(from.board, cardId);
    if (!sourceLocation) {
      return;
    }

    const destinationDroppableScoped = parseScopedId(result.destination.droppableId);
    if (!destinationDroppableScoped || destinationDroppableScoped.boardKey !== to.boardKey) {
      return;
    }

    const destinationPriorityGroup = parsePriorityGroupDroppableId(destinationDroppableScoped.id);
    const destinationColumnId = destinationPriorityGroup
      ? destinationPriorityGroup.columnId
      : destinationDroppableScoped.id;

    const destinationColumn = to.board.columns.find((column) => column.id === destinationColumnId);
    if (!destinationColumn) {
      return;
    }

    const destinationPriority = destinationPriorityGroup?.priority;
    const destinationIndex = result.destination.index;

    const destinationPlacement = destinationPriorityGroup
      ? getPriorityGroupPlacement(to.board, {
          cardId,
          columnId: destinationColumnId,
          priority: destinationPriorityGroup.priority,
          destinationIndex,
        })
      : input.search.priority.length > 0 && input.search.groupBy === "column"
        ? getFilteredColumnPlacement(to.board, {
            cardId,
            columnId: destinationColumnId,
            priority: input.search.priority,
            destinationIndex,
          })
        : {
            columnId: destinationColumnId,
            destinationIndex,
            prevId: destinationColumn.cards[destinationIndex - 1]?.id ?? null,
            nextId: destinationColumn.cards[destinationIndex]?.id ?? null,
          };

    if (!destinationPlacement) {
      return;
    }

    const movedCard = sourceLocation.card;
    const sourcePriority = movedCard.priority;
    const finalPriority = destinationPriority ?? sourcePriority;

    const destColumnCardsWithoutMoved = destinationColumn.cards.filter((c) => c.id !== cardId);
    const prevCard =
      destinationPlacement.prevId !== null
        ? destColumnCardsWithoutMoved.find((c) => c.id === destinationPlacement.prevId)
        : null;
    const nextCard =
      destinationPlacement.nextId !== null
        ? destColumnCardsWithoutMoved.find((c) => c.id === destinationPlacement.nextId)
        : null;
    const optimisticPosition = keyBetween(prevCard?.position ?? null, nextCard?.position ?? null);

    const sourceSlice = getCardSlice(sourceLocation.column.id, sourcePriority, input.search);
    const destinationSlice = getCardSlice(
      destinationPlacement.columnId,
      finalPriority,
      input.search,
    );

    patchSliceCache(input.queryClient, sourceSlice, { type: "remove", cardId });
    patchSliceCache(input.queryClient, destinationSlice, {
      type: "insert",
      card: {
        id: movedCard.id,
        columnId: destinationPlacement.columnId,
        title: movedCard.title,
        description: movedCard.description,
        priority: finalPriority,
        position: optimisticPosition,
        version: movedCard.version,
        tags: movedCard.tags,
      },
    });
    from.state.setConflictMessage(null);
    to.state.setConflictMessage(null);

    try {
      await from.mutations.moveCard.mutateAsync({
        cardId,
        targetColumnId: destinationPlacement.columnId,
        priority: destinationPriority,
        prevCardId: destinationPlacement.prevId,
        nextCardId: destinationPlacement.nextId,
        expectedVersion: sourceLocation.card.version,
      });

      await Promise.all([
        input.main.mutations.refreshBoard(),
        input.drawer ? input.drawer.mutations.refreshBoard() : Promise.resolve(),
      ]);
      input.setAnnouncement("Card moved.");
    } catch (error) {
      clearOptimisticStructureBoth();
      const message =
        (error as { message?: string }).message ??
        "We couldn’t move that card because the board changed. Refresh and try again.";
      from.state.setConflictMessage(message);
      await refetchBoth();
    }
  };

  return (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const srcDroppable = parseScopedId(result.source.droppableId);
    const dstDroppable = parseScopedId(result.destination.droppableId);
    const draggable = parseScopedId(result.draggableId);
    if (!srcDroppable || !dstDroppable || !draggable) {
      return;
    }

    const srcPane = getPane(srcDroppable.boardKey);
    const dstPane = getPane(dstDroppable.boardKey);
    if (!srcPane || !dstPane) {
      return;
    }

    if (result.type === "COLUMN") {
      if (srcPane.boardKey !== dstPane.boardKey) {
        return;
      }
      void commitColumnPlacement(srcPane, draggable.id, result.destination.index);
      return;
    }

    if (srcPane.boardKey !== dstPane.boardKey) {
      void commitCrossBoardMove(srcPane, dstPane, result);
      return;
    }

    const board = srcPane.board;
    if (!board) {
      return;
    }

    const sourcePriorityGroup = parsePriorityGroupDroppableId(srcDroppable.id);
    const destinationPriorityGroup = parsePriorityGroupDroppableId(dstDroppable.id);
    const priorityGroupReorderEnabled =
      input.search.view === "board" && input.search.groupBy === "priority";
    const filteredColumnReorderEnabled =
      input.search.view === "board" &&
      input.search.groupBy === "column" &&
      input.search.priority.length > 0;
    const columnReorderEnabled =
      input.search.view === "board" &&
      input.search.groupBy === "column" &&
      input.search.priority.length === 0;

    if (priorityGroupReorderEnabled && sourcePriorityGroup && destinationPriorityGroup) {
      if (
        result.source.droppableId === result.destination.droppableId &&
        result.source.index === result.destination.index
      ) {
        return;
      }

      const cardLocation = getCardPosition(board, draggable.id);
      if (!cardLocation) {
        return;
      }

      const placement = getPriorityGroupPlacement(board, {
        cardId: draggable.id,
        columnId: destinationPriorityGroup.columnId,
        priority: destinationPriorityGroup.priority,
        destinationIndex: result.destination.index,
      });
      if (!placement) {
        return;
      }

      void commitCardPlacement(srcPane, board, {
        cardId: draggable.id,
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
      if (
        result.source.droppableId === result.destination.droppableId &&
        result.source.index === result.destination.index
      ) {
        return;
      }

      if (dstDroppable.id === "board-columns") {
        return;
      }

      const cardLocation = getCardPosition(board, draggable.id);
      if (!cardLocation) {
        return;
      }

      const placement = getFilteredColumnPlacement(board, {
        cardId: draggable.id,
        columnId: dstDroppable.id,
        priority: input.search.priority,
        destinationIndex: result.destination.index,
      });
      if (!placement) {
        return;
      }

      void commitCardPlacement(srcPane, board, {
        cardId: draggable.id,
        sourceColumnId: cardLocation.column.id,
        sourceIndex: cardLocation.cardIndex,
        destinationColumnId: placement.columnId,
        destinationIndex: placement.destinationIndex,
        expectedVersion: cardLocation.card.version,
      });
      return;
    }

    if (result.type === "COLUMN") {
      void commitColumnPlacement(srcPane, draggable.id, result.destination.index);
      return;
    }

    if (!columnReorderEnabled || result.type !== "CARD") {
      return;
    }

    if (dstDroppable.id === "board-columns") {
      return;
    }

    const cardLocation = getCardPosition(board, draggable.id);
    if (!cardLocation) {
      return;
    }

    void commitCardPlacement(srcPane, board, {
      cardId: draggable.id,
      sourceColumnId: srcDroppable.id,
      sourceIndex: result.source.index,
      destinationColumnId: dstDroppable.id,
      destinationIndex: result.destination.index,
      expectedVersion: cardLocation.card.version,
    });
  };
}

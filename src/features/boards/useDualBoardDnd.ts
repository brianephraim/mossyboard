import type { DropResult } from "@hello-pangea/dnd";

import type { TRPCClientUtils } from "../../trpc/client";
import {
  getCardPosition,
  getColumnPosition,
  getNeighborIds,
  reorderBoardCards,
  reorderBoardColumns,
} from "./model";
import {
  getFilteredColumnPlacement,
  getPriorityGroupPlacement,
  parsePriorityGroupDroppableId,
} from "./priorityGrouping";
import type { BoardDetailSearch, CardPriority, LoadedBoard } from "./types";
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
    setOptimisticBoard: (b: LoadedBoard | null) => void;
    setConflictMessage: (m: string | null) => void;
  };
  mutations: BoardMutations;
};

export function useDualBoardDnd(input: {
  search: BoardDetailSearch;
  main: Pane;
  drawer: Pane | null;
  utils: TRPCClientUtils;
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

  const clearOptimisticBoth = () => {
    input.main.state.setOptimisticBoard(null);
    if (input.drawer) {
      input.drawer.state.setOptimisticBoard(null);
    }
  };

  const refetchBoth = async () => {
    await Promise.all([
      input.main.mutations.refreshBoard(),
      input.drawer ? input.drawer.mutations.refreshBoard() : Promise.resolve(),
    ]);
  };

  const invalidateListsFor = async (boardIds: string[]) => {
    await Promise.all(
      boardIds.map((boardId) => input.utils.card.listByBoard.invalidate({ boardId })),
    );
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
    const nextBoard = reorderBoardColumns(currentBoard, location.columnIndex, destinationIndex);
    const movedColumn = nextBoard.columns[destinationIndex];
    if (!movedColumn) {
      return;
    }
    const { prevId, nextId } = getNeighborIds(nextBoard.columns, destinationIndex);
    pane.state.setOptimisticBoard(nextBoard);
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
    inputPlacement: {
      cardId: string;
      sourceColumnId: string;
      sourceIndex: number;
      destinationColumnId: string;
      destinationIndex: number;
      destinationPriority?: CardPriority;
      expectedVersion: number;
    },
  ) => {
    const currentLocation = getCardPosition(currentBoard, inputPlacement.cardId);
    const currentPriority = currentLocation?.card.priority;
    if (
      inputPlacement.sourceColumnId === inputPlacement.destinationColumnId &&
      inputPlacement.sourceIndex === inputPlacement.destinationIndex &&
      (!inputPlacement.destinationPriority ||
        inputPlacement.destinationPriority === currentPriority)
    ) {
      return;
    }

    const nextBoard = reorderBoardCards(currentBoard, inputPlacement);
    const destinationColumn = nextBoard.columns.find(
      (column) => column.id === inputPlacement.destinationColumnId,
    );
    if (!destinationColumn) {
      return;
    }

    const { prevId, nextId } = getNeighborIds(
      destinationColumn.cards,
      inputPlacement.destinationIndex,
    );
    pane.state.setOptimisticBoard(nextBoard);
    pane.state.setConflictMessage(null);

    if (inputPlacement.sourceColumnId === inputPlacement.destinationColumnId) {
      await pane.mutations.reorderCard.mutateAsync({
        cardId: inputPlacement.cardId,
        columnId: inputPlacement.destinationColumnId,
        priority: inputPlacement.destinationPriority,
        prevCardId: prevId,
        nextCardId: nextId,
        expectedVersion: inputPlacement.expectedVersion,
      });
      return;
    }

    await pane.mutations.moveCard.mutateAsync({
      cardId: inputPlacement.cardId,
      targetColumnId: inputPlacement.destinationColumnId,
      priority: inputPlacement.destinationPriority,
      prevCardId: prevId,
      nextCardId: nextId,
      expectedVersion: inputPlacement.expectedVersion,
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

    const nextFrom = reorderBoardCards(from.board, {
      cardId,
      sourceColumnId: sourceLocation.column.id,
      sourceIndex: sourceLocation.cardIndex,
      destinationColumnId: sourceLocation.column.id,
      destinationIndex: sourceLocation.cardIndex,
      destinationPriority,
      expectedVersion: sourceLocation.card.version,
    });
    const removedFrom = nextFrom; // no-op reorder used above; we’ll do manual remove+insert below instead

    const fromColumns = from.board.columns.map((column) => ({
      ...column,
      cards: column.cards.filter((c) => c.id !== cardId),
    }));
    const toColumns = to.board.columns.map((column) => ({ ...column, cards: [...column.cards] }));
    const movedCard = sourceLocation.card;

    const toColumn = toColumns.find((c) => c.id === destinationPlacement.columnId);
    if (!toColumn) {
      return;
    }

    toColumn.cards.splice(destinationPlacement.destinationIndex, 0, {
      ...movedCard,
      columnId: destinationPlacement.columnId,
      priority: destinationPriority ?? movedCard.priority,
    });

    from.state.setOptimisticBoard({ ...from.board, columns: fromColumns });
    to.state.setOptimisticBoard({ ...to.board, columns: toColumns });
    from.state.setConflictMessage(null);
    to.state.setConflictMessage(null);

    try {
      await input.main.mutations.moveCard.mutateAsync; // keep TS from narrowing weirdly
      await from.mutations.moveCard.mutateAsync({
        cardId,
        targetColumnId: destinationPlacement.columnId,
        priority: destinationPriority,
        prevCardId: destinationPlacement.prevId,
        nextCardId: destinationPlacement.nextId,
        expectedVersion: sourceLocation.card.version,
      });

      await Promise.all([
        invalidateListsFor([from.boardId, to.boardId]),
        input.main.mutations.refreshBoard(),
        input.drawer ? input.drawer.mutations.refreshBoard() : Promise.resolve(),
      ]);
      input.setAnnouncement("Card moved.");
    } catch (error) {
      clearOptimisticBoth();
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
      input.search.view === "board" && input.search.groupBy === "priority" && true;
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

import { boardPriorityValues, getCardPosition } from "./model";
import type { CardPriority, LoadedBoard } from "./types";

const PRIORITY_GROUP_DROPPABLE_PREFIX = "priority-group";

export function getPriorityGroupDroppableId(columnId: string, priority: CardPriority) {
  return `${PRIORITY_GROUP_DROPPABLE_PREFIX}:${columnId}:${priority}`;
}

export function parsePriorityGroupDroppableId(
  droppableId: string,
): { columnId: string; priority: CardPriority } | null {
  const [prefix, columnId, priority] = droppableId.split(":");
  if (
    prefix !== PRIORITY_GROUP_DROPPABLE_PREFIX ||
    !columnId ||
    !priority ||
    !boardPriorityValues.includes(priority as CardPriority)
  ) {
    return null;
  }

  return {
    columnId,
    priority: priority as CardPriority,
  };
}

export function getPriorityGroupPlacement(
  board: LoadedBoard,
  input: {
    cardId: string;
    columnId: string;
    priority: CardPriority;
    destinationIndex: number;
  },
): {
  columnId: string;
  destinationIndex: number;
  prevId: string | null;
  nextId: string | null;
} | null {
  return getVisibleSubsetPlacement(board, {
    cardId: input.cardId,
    columnId: input.columnId,
    destinationIndex: input.destinationIndex,
    includeCard: (card) => card.priority === input.priority,
  });
}

export function getFilteredColumnPlacement(
  board: LoadedBoard,
  input: {
    cardId: string;
    columnId: string;
    priority: CardPriority[];
    destinationIndex: number;
  },
): {
  columnId: string;
  destinationIndex: number;
  prevId: string | null;
  nextId: string | null;
} | null {
  const visiblePriorities = new Set(input.priority);
  if (visiblePriorities.size === 0) {
    return null;
  }

  return getVisibleSubsetPlacement(board, {
    cardId: input.cardId,
    columnId: input.columnId,
    destinationIndex: input.destinationIndex,
    includeCard: (card) => visiblePriorities.has(card.priority),
  });
}

function getVisibleSubsetPlacement(
  board: LoadedBoard,
  input: {
    cardId: string;
    columnId: string;
    destinationIndex: number;
    includeCard: (card: LoadedBoard["columns"][number]["cards"][number]) => boolean;
  },
): {
  columnId: string;
  destinationIndex: number;
  prevId: string | null;
  nextId: string | null;
} | null {
  const sourceLocation = getCardPosition(board, input.cardId);
  if (!sourceLocation) {
    return null;
  }

  const targetColumn = board.columns.find((column) => column.id === input.columnId);
  if (!targetColumn) {
    return null;
  }

  const columnCardsWithoutMoved = targetColumn.cards.filter((card) => card.id !== input.cardId);
  const visibleCards = columnCardsWithoutMoved.filter(input.includeCard);

  if (input.destinationIndex < 0 || input.destinationIndex > visibleCards.length) {
    return null;
  }

  if (visibleCards.length === 0) {
    return {
      columnId: targetColumn.id,
      destinationIndex: columnCardsWithoutMoved.length,
      prevId: columnCardsWithoutMoved.at(-1)?.id ?? null,
      nextId: null,
    };
  }

  if (input.destinationIndex === 0) {
    const topVisibleCard = visibleCards[0];
    if (!topVisibleCard) {
      return null;
    }

    const topVisibleCardIndex = columnCardsWithoutMoved.findIndex(
      (card) => card.id === topVisibleCard.id,
    );
    if (topVisibleCardIndex === -1) {
      return null;
    }

    return {
      columnId: targetColumn.id,
      destinationIndex: topVisibleCardIndex,
      prevId: columnCardsWithoutMoved[topVisibleCardIndex - 1]?.id ?? null,
      nextId: topVisibleCard.id,
    };
  }

  const previousVisibleCard = visibleCards[input.destinationIndex - 1];
  if (!previousVisibleCard) {
    return null;
  }

  const previousVisibleCardIndex = columnCardsWithoutMoved.findIndex(
    (card) => card.id === previousVisibleCard.id,
  );
  if (previousVisibleCardIndex === -1) {
    return null;
  }

  return {
    columnId: targetColumn.id,
    destinationIndex: previousVisibleCardIndex + 1,
    prevId: previousVisibleCard.id,
    nextId: columnCardsWithoutMoved[previousVisibleCardIndex + 1]?.id ?? null,
  };
}

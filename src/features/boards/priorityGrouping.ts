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
  const sourceLocation = getCardPosition(board, input.cardId);
  if (!sourceLocation) {
    return null;
  }

  const targetColumn = board.columns.find((column) => column.id === input.columnId);
  if (!targetColumn) {
    return null;
  }

  const columnCardsWithoutMoved = targetColumn.cards.filter((card) => card.id !== input.cardId);
  const targetGroupCards = columnCardsWithoutMoved.filter(
    (card) => card.priority === input.priority,
  );

  if (
    targetGroupCards.length === 0 ||
    input.destinationIndex < 0 ||
    input.destinationIndex > targetGroupCards.length
  ) {
    return null;
  }

  if (input.destinationIndex === 0) {
    const topGroupCard = targetGroupCards[0];
    if (!topGroupCard) {
      return null;
    }

    const topGroupCardIndex = columnCardsWithoutMoved.findIndex(
      (card) => card.id === topGroupCard.id,
    );
    if (topGroupCardIndex === -1) {
      return null;
    }

    return {
      columnId: targetColumn.id,
      destinationIndex: topGroupCardIndex,
      prevId: columnCardsWithoutMoved[topGroupCardIndex - 1]?.id ?? null,
      nextId: topGroupCard.id,
    };
  }

  const previousGroupCard = targetGroupCards[input.destinationIndex - 1];
  if (!previousGroupCard) {
    return null;
  }

  const previousGroupCardIndex = columnCardsWithoutMoved.findIndex(
    (card) => card.id === previousGroupCard.id,
  );
  if (previousGroupCardIndex === -1) {
    return null;
  }

  return {
    columnId: targetColumn.id,
    destinationIndex: previousGroupCardIndex + 1,
    prevId: previousGroupCard.id,
    nextId: columnCardsWithoutMoved[previousGroupCardIndex + 1]?.id ?? null,
  };
}

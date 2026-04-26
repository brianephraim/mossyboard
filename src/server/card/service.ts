import { trpcErrors } from "../trpc/init";
import { type CardPriority } from "../db/schema";
import {
  createCard,
  getCard,
  listCardsByBoard,
  moveCard,
  reorderCard,
  softDeleteCard,
  updateCard,
  type CardDetailRow,
  type CardListItemRow,
} from "./repo";

export async function createCardForUser(
  ownerId: string,
  input: {
    columnId: string;
    title: string;
    description?: string;
    priority?: CardPriority;
    prevCardId?: string | null;
    nextCardId?: string | null;
  },
) {
  const created = await createCard({
    ownerId,
    columnId: input.columnId,
    title: input.title.trim(),
    description: input.description ?? "",
    priority: input.priority ?? "none",
    prevCardId: input.prevCardId,
    nextCardId: input.nextCardId,
  });

  return {
    cardId: created.id,
  };
}

export async function updateCardForUser(
  ownerId: string,
  input: {
    cardId: string;
    title: string;
    description: string;
    priority: CardPriority;
    expectedVersion: number;
  },
) {
  const updated = await updateCard({
    ownerId,
    cardId: input.cardId,
    title: input.title.trim(),
    description: input.description,
    priority: input.priority,
    expectedVersion: input.expectedVersion,
  });
  if (!updated) {
    throw trpcErrors.notFound("Card not found");
  }

  return {
    cardId: updated.id,
    version: updated.version,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function softDeleteCardForUser(
  ownerId: string,
  input: {
    cardId: string;
    expectedVersion: number;
  },
) {
  const deleted = await softDeleteCard({
    ownerId,
    cardId: input.cardId,
    expectedVersion: input.expectedVersion,
  });
  if (!deleted) {
    throw trpcErrors.notFound("Card not found");
  }

  return {
    cardId: deleted.id,
    deletedAt: deleted.deletedAt.toISOString(),
  };
}

export async function getCardForUser(
  ownerId: string,
  input: {
    cardId: string;
    boardId?: string;
  },
) {
  const card = await getCard({
    ownerId,
    cardId: input.cardId,
    boardId: input.boardId,
  });
  if (!card) {
    throw trpcErrors.notFound("Card not found");
  }

  return {
    card: serializeCardDetail(card),
  };
}

export async function moveCardForUser(
  ownerId: string,
  input: {
    cardId: string;
    targetColumnId: string;
    priority?: CardPriority;
    prevCardId?: string | null;
    nextCardId?: string | null;
    expectedVersion: number;
  },
) {
  const moved = await moveCard({
    ownerId,
    cardId: input.cardId,
    targetColumnId: input.targetColumnId,
    priority: input.priority,
    prevCardId: input.prevCardId,
    nextCardId: input.nextCardId,
    expectedVersion: input.expectedVersion,
  });
  if (!moved) {
    throw trpcErrors.notFound("Card not found");
  }

  return {
    cardId: moved.id,
    columnId: moved.columnId,
    position: moved.position,
    version: moved.version,
    updatedAt: moved.updatedAt.toISOString(),
  };
}

export async function reorderCardForUser(
  ownerId: string,
  input: {
    cardId: string;
    columnId: string;
    priority?: CardPriority;
    prevCardId?: string | null;
    nextCardId?: string | null;
    expectedVersion: number;
  },
) {
  const reordered = await reorderCard({
    ownerId,
    cardId: input.cardId,
    columnId: input.columnId,
    priority: input.priority,
    prevCardId: input.prevCardId,
    nextCardId: input.nextCardId,
    expectedVersion: input.expectedVersion,
  });
  if (!reordered) {
    throw trpcErrors.notFound("Card not found");
  }

  return {
    cardId: reordered.id,
    position: reordered.position,
    version: reordered.version,
    updatedAt: reordered.updatedAt.toISOString(),
  };
}

export async function listCardsByBoardForUser(
  ownerId: string,
  input: {
    boardId: string;
    filters?: {
      priority?: CardPriority[];
    };
    limit: number;
    cursor?: {
      updatedAt: string;
      cardId: string;
    } | null;
  },
) {
  const listed = await listCardsByBoard({
    ownerId,
    boardId: input.boardId,
    priority: input.filters?.priority,
    limit: input.limit,
    cursor: input.cursor
      ? {
          updatedAt: new Date(input.cursor.updatedAt),
          cardId: input.cursor.cardId,
        }
      : null,
  });

  return {
    items: listed.items.map(serializeCardListItem),
    nextCursor: listed.nextCursor
      ? {
          updatedAt: listed.nextCursor.updatedAt.toISOString(),
          cardId: listed.nextCursor.cardId,
        }
      : null,
  };
}

function serializeCardDetail(row: CardDetailRow) {
  return {
    id: row.id,
    columnId: row.columnId,
    columnTitle: row.columnTitle,
    title: row.title,
    description: row.description,
    priority: row.priority,
    position: row.position,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeCardListItem(row: CardListItemRow) {
  return {
    id: row.id,
    columnId: row.columnId,
    columnTitle: row.columnTitle,
    title: row.title,
    description: row.description,
    priority: row.priority,
    position: row.position,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

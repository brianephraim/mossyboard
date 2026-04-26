import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";

import { boards, cards, type CardPriority, columns } from "../db/schema";
import { db } from "../db/client";
import { trpcErrors } from "../trpc/init";
import { resolveOrderedPosition } from "../board/ordered-position";
import {
  getOwnedBoard,
  getOwnedCard,
  getOwnedColumn,
  listActiveCardsForColumn,
  lockOwnedCard,
  touchBoard,
} from "../board/repo-shared";

export type CardDetailRow = {
  id: string;
  columnId: string;
  columnTitle: string;
  title: string;
  description: string;
  priority: CardPriority;
  position: string;
  version: number;
  updatedAt: Date;
};

export type CardListItemRow = {
  id: string;
  columnId: string;
  columnTitle: string;
  title: string;
  description: string;
  priority: CardPriority;
  position: string;
  version: number;
  updatedAt: Date;
};

export async function createCard(input: {
  ownerId: string;
  columnId: string;
  title: string;
  description: string;
  priority: CardPriority;
  prevCardId?: string | null;
  nextCardId?: string | null;
}): Promise<{ id: string }> {
  const targetColumn = await getOwnedColumn(db, {
    ownerId: input.ownerId,
    columnId: input.columnId,
  });
  if (!targetColumn) {
    throw trpcErrors.notFound("Column not found");
  }

  const orderedCards = await listActiveCardsForColumn(db, {
    columnId: targetColumn.id,
  });
  const position = resolveOrderedPosition(orderedCards, {
    prevId: input.prevCardId,
    nextId: input.nextCardId,
    entityLabel: "Card",
  });

  return db.transaction(async (tx) => {
    const now = new Date();
    const cardId = randomUUID();
    const [created] = await tx
      .insert(cards)
      .values({
        id: cardId,
        columnId: targetColumn.id,
        title: input.title,
        description: input.description,
        priority: input.priority,
        position,
        version: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: cards.id,
      });

    if (!created) {
      throw new Error("Failed to create card");
    }

    await touchBoard(tx, {
      boardId: targetColumn.boardId,
      now,
    });

    return created;
  });
}

export async function updateCard(input: {
  ownerId: string;
  cardId: string;
  title: string;
  description: string;
  priority: CardPriority;
  expectedVersion: number;
}): Promise<{ id: string; version: number; updatedAt: Date } | null> {
  return db.transaction(async (tx) => {
    const lockedCard = await lockOwnedCard(tx, {
      ownerId: input.ownerId,
      cardId: input.cardId,
    });
    if (!lockedCard) {
      return null;
    }

    if (lockedCard.version !== input.expectedVersion) {
      throw trpcErrors.conflict("Version conflict");
    }

    const now = new Date();
    const [updated] = await tx
      .update(cards)
      .set({
        title: input.title,
        description: input.description,
        priority: input.priority,
        version: lockedCard.version + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(cards.id, lockedCard.id),
          eq(cards.version, lockedCard.version),
          isNull(cards.deletedAt),
        ),
      )
      .returning({
        id: cards.id,
        version: cards.version,
        updatedAt: cards.updatedAt,
      });

    if (!updated) {
      throw trpcErrors.conflict("Version conflict");
    }

    await touchBoard(tx, {
      boardId: lockedCard.boardId,
      now,
    });

    return updated;
  });
}

export async function softDeleteCard(input: {
  ownerId: string;
  cardId: string;
  expectedVersion: number;
}): Promise<{ id: string; deletedAt: Date } | null> {
  return db.transaction(async (tx) => {
    const lockedCard = await lockOwnedCard(tx, {
      ownerId: input.ownerId,
      cardId: input.cardId,
    });
    if (!lockedCard) {
      return null;
    }

    if (lockedCard.version !== input.expectedVersion) {
      throw trpcErrors.conflict("Version conflict");
    }

    const now = new Date();
    const [deleted] = await tx
      .update(cards)
      .set({
        deletedAt: now,
        updatedAt: now,
        version: lockedCard.version + 1,
      })
      .where(
        and(
          eq(cards.id, lockedCard.id),
          eq(cards.version, lockedCard.version),
          isNull(cards.deletedAt),
        ),
      )
      .returning({
        id: cards.id,
        deletedAt: cards.deletedAt,
      });

    if (!deleted?.deletedAt) {
      throw trpcErrors.conflict("Version conflict");
    }
    const deletedAt = deleted.deletedAt;

    await touchBoard(tx, {
      boardId: lockedCard.boardId,
      now,
    });

    return { id: deleted.id, deletedAt };
  });
}

export async function getCard(input: {
  ownerId: string;
  cardId: string;
  boardId?: string;
}): Promise<CardDetailRow | null> {
  const card = await getOwnedCard(db, {
    ownerId: input.ownerId,
    cardId: input.cardId,
  });
  if (!card) {
    return null;
  }

  if (input.boardId && input.boardId !== card.boardId) {
    return null;
  }

  return {
    id: card.id,
    columnId: card.columnId,
    columnTitle: card.columnTitle,
    title: card.title,
    description: card.description,
    priority: card.priority,
    position: card.position,
    version: card.version,
    updatedAt: card.updatedAt,
  };
}

export async function moveCard(input: {
  ownerId: string;
  cardId: string;
  targetColumnId: string;
  priority?: CardPriority;
  prevCardId?: string | null;
  nextCardId?: string | null;
  expectedVersion: number;
}): Promise<{
  id: string;
  columnId: string;
  position: string;
  version: number;
  updatedAt: Date;
} | null> {
  return placeCard({
    ownerId: input.ownerId,
    cardId: input.cardId,
    targetColumnId: input.targetColumnId,
    priority: input.priority,
    prevCardId: input.prevCardId,
    nextCardId: input.nextCardId,
    expectedVersion: input.expectedVersion,
  });
}

export async function reorderCard(input: {
  ownerId: string;
  cardId: string;
  columnId: string;
  priority?: CardPriority;
  prevCardId?: string | null;
  nextCardId?: string | null;
  expectedVersion: number;
}): Promise<{
  id: string;
  columnId: string;
  position: string;
  version: number;
  updatedAt: Date;
} | null> {
  return placeCard({
    ownerId: input.ownerId,
    cardId: input.cardId,
    targetColumnId: input.columnId,
    priority: input.priority,
    prevCardId: input.prevCardId,
    nextCardId: input.nextCardId,
    expectedVersion: input.expectedVersion,
    requireCurrentColumnId: input.columnId,
  });
}

export async function listCardsByBoard(input: {
  ownerId: string;
  boardId: string;
  priority?: CardPriority[];
  limit: number;
  cursor?: {
    updatedAt: Date;
    cardId: string;
  } | null;
}): Promise<{
  items: CardListItemRow[];
  nextCursor: {
    updatedAt: Date;
    cardId: string;
  } | null;
}> {
  const ownedBoard = await getOwnedBoard(db, {
    ownerId: input.ownerId,
    boardId: input.boardId,
  });
  if (!ownedBoard) {
    throw trpcErrors.notFound("Board not found");
  }

  const filters = [
    eq(columns.boardId, input.boardId),
    isNull(columns.deletedAt),
    isNull(cards.deletedAt),
  ];

  if (input.priority && input.priority.length > 0) {
    filters.push(inArray(cards.priority, input.priority));
  }

  if (input.cursor) {
    filters.push(
      or(
        lt(cards.updatedAt, input.cursor.updatedAt),
        and(eq(cards.updatedAt, input.cursor.updatedAt), lt(cards.id, input.cursor.cardId)),
      )!,
    );
  }

  const rows = await db
    .select({
      id: cards.id,
      columnId: cards.columnId,
      columnTitle: columns.title,
      title: cards.title,
      description: cards.description,
      priority: cards.priority,
      position: cards.position,
      version: cards.version,
      updatedAt: cards.updatedAt,
    })
    .from(cards)
    .innerJoin(columns, eq(cards.columnId, columns.id))
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(
      and(
        eq(boards.id, ownedBoard.id),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
        ...filters,
      ),
    )
    .orderBy(desc(cards.updatedAt), desc(cards.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const lastItem = items.at(-1);

  return {
    items,
    nextCursor:
      hasMore && lastItem
        ? {
            updatedAt: lastItem.updatedAt,
            cardId: lastItem.id,
          }
        : null,
  };
}

async function placeCard(input: {
  ownerId: string;
  cardId: string;
  targetColumnId: string;
  priority?: CardPriority;
  prevCardId?: string | null;
  nextCardId?: string | null;
  expectedVersion: number;
  requireCurrentColumnId?: string;
}) {
  return db.transaction(async (tx) => {
    const lockedCard = await lockOwnedCard(tx, {
      ownerId: input.ownerId,
      cardId: input.cardId,
    });
    if (!lockedCard) {
      return null;
    }

    if (lockedCard.version !== input.expectedVersion) {
      throw trpcErrors.conflict("Version conflict");
    }

    if (input.requireCurrentColumnId && lockedCard.columnId !== input.requireCurrentColumnId) {
      throw trpcErrors.badRequest("Card does not belong to the provided column");
    }

    const targetColumn = await getOwnedColumn(tx, {
      ownerId: input.ownerId,
      columnId: input.targetColumnId,
    });
    if (!targetColumn) {
      throw trpcErrors.notFound("Column not found");
    }

    const orderedCards = await listActiveCardsForColumn(tx, {
      columnId: targetColumn.id,
    });
    const position = resolveOrderedPosition(orderedCards, {
      prevId: input.prevCardId,
      nextId: input.nextCardId,
      excludedId: lockedCard.id,
      entityLabel: "Card",
    });

    const now = new Date();
    const [updated] = await tx
      .update(cards)
      .set({
        columnId: targetColumn.id,
        priority: input.priority ?? lockedCard.priority,
        position,
        version: lockedCard.version + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(cards.id, lockedCard.id),
          eq(cards.version, lockedCard.version),
          isNull(cards.deletedAt),
        ),
      )
      .returning({
        id: cards.id,
        columnId: cards.columnId,
        position: cards.position,
        version: cards.version,
        updatedAt: cards.updatedAt,
      });

    if (!updated) {
      throw trpcErrors.conflict("Version conflict");
    }

    await touchBoard(tx, {
      boardId: lockedCard.boardId,
      now,
    });
    if (targetColumn.boardId !== lockedCard.boardId) {
      await touchBoard(tx, {
        boardId: targetColumn.boardId,
        now,
      });
    }

    return updated;
  });
}

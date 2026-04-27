import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";

import {
  cardPriorityValues,
  boards,
  cards,
  cardTags,
  columns,
  tags,
  type CardPriority,
} from "../db/schema";
import { db } from "../db/client";
import { trpcErrors } from "../trpc/init";
import { resolveOrderedPosition } from "../board/ordered-position";
import { keyBetween } from "../../lib/ordering/key-between";
import {
  getOwnedBoard,
  getOwnedCard,
  getOwnedColumn,
  listActiveCardsForColumn,
  listTagsForCards,
  lockOwnedCard,
  touchBoard,
} from "../board/repo-shared";

const POSITION_ALPHABET = "0123456789";
const POSITION_BASE = BigInt(POSITION_ALPHABET.length);
const POSITION_KEY_WIDTH = 16;
const MAX_POSITION_VALUE = POSITION_BASE ** BigInt(POSITION_KEY_WIDTH) - 1n;

export type CardTagSummary = {
  id: string;
  name: string;
  normalizedName: string;
};

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
  tags: CardTagSummary[];
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
  tags: CardTagSummary[];
};

function randomIntInclusive(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function generateRandomTitle() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const targetLength = randomIntInclusive(5, 50);

  for (let attempt = 0; attempt < 20; attempt++) {
    let out = "";
    for (let i = 0; i < targetLength; i++) {
      const roll = Math.random();
      if (roll < 0.15) {
        out += " ";
        continue;
      }
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    const trimmed = out.trim();
    if (trimmed.length >= 5 && trimmed.length <= 50) {
      return trimmed;
    }
  }

  // Fallback: guaranteed non-empty + within bounds.
  return "Sample card";
}

function encodePositionKey(input: bigint): string {
  if (input <= 0n || input >= MAX_POSITION_VALUE) {
    throw new Error("Position key is out of range");
  }

  let remaining = input;
  const digits = Array.from({ length: POSITION_KEY_WIDTH }, () => POSITION_ALPHABET[0]);

  for (let index = POSITION_KEY_WIDTH - 1; index >= 0; index -= 1) {
    const digit = Number(remaining % POSITION_BASE);
    digits[index] = POSITION_ALPHABET[digit] ?? POSITION_ALPHABET[0];
    remaining /= POSITION_BASE;
  }

  return digits.join("");
}

async function rebalancePositionsForColumn(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: { columnId: string },
) {
  const ordered = await tx
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.columnId, input.columnId), isNull(cards.deletedAt)))
    .orderBy(cards.position, cards.id);

  if (ordered.length === 0) {
    return null;
  }

  const n = BigInt(ordered.length);
  const step = MAX_POSITION_VALUE / (n + 1n);
  if (step <= 1n) {
    throw trpcErrors.conflict("Unable to rebalance card positions");
  }

  const updates = ordered.map((row, idx) => {
    const value = step * BigInt(idx + 1);
    return { id: row.id, position: encodePositionKey(value) };
  });

  await tx.execute(sql`
    UPDATE ${cards}
    SET position = CASE id
      ${sql.join(
        updates.map((u) => sql`WHEN ${u.id} THEN ${u.position}`),
        sql.raw(" "),
      )}
      ELSE position
    END
    WHERE ${cards.columnId} = ${input.columnId} AND ${cards.deletedAt} IS NULL
  `);

  const last = updates[updates.length - 1];
  return last?.position ?? null;
}

export async function addSampleCardsToBoard(input: {
  ownerId: string;
  boardId: string;
  count: number;
}): Promise<{ createdCount: number }> {
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 2000) {
    throw trpcErrors.badRequest("Invalid count");
  }

  return db.transaction(async (tx) => {
    const board = await getOwnedBoard(tx, {
      ownerId: input.ownerId,
      boardId: input.boardId,
    });
    if (!board) {
      throw trpcErrors.notFound("Board not found");
    }

    const activeColumns = await tx
      .select({
        id: columns.id,
      })
      .from(columns)
      .where(and(eq(columns.boardId, board.id), isNull(columns.deletedAt)));

    if (activeColumns.length === 0) {
      throw trpcErrors.badRequest("Board has no columns");
    }

    const byColumn = new Map<string, number>();
    for (const col of activeColumns) {
      byColumn.set(col.id, 0);
    }
    for (let i = 0; i < input.count; i++) {
      const col = randomChoice(activeColumns);
      byColumn.set(col.id, (byColumn.get(col.id) ?? 0) + 1);
    }

    const now = new Date();
    let createdCount = 0;

    for (const [columnId, countForColumn] of byColumn.entries()) {
      if (countForColumn <= 0) {
        continue;
      }

      const ordered = await listActiveCardsForColumn(tx, { columnId });
      let lastPosition: string | null =
        ordered.length > 0 ? ordered[ordered.length - 1]!.position : null;

      const values: Array<typeof cards.$inferInsert> = [];
      for (let i = 0; i < countForColumn; i++) {
        try {
          lastPosition = keyBetween(lastPosition, null);
        } catch {
          // Fractional ordering space can be exhausted near MAX when repeatedly appending.
          // Rebalance this column's existing keys to regain space, then retry.
          lastPosition = await rebalancePositionsForColumn(tx, { columnId });
          lastPosition = keyBetween(lastPosition, null);
        }
        values.push({
          id: randomUUID(),
          columnId,
          title: generateRandomTitle(),
          description: "",
          priority: randomChoice(cardPriorityValues),
          position: lastPosition,
          version: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      await tx.insert(cards).values(values);
      createdCount += values.length;
    }

    await touchBoard(tx, { boardId: board.id, now });

    return { createdCount };
  });
}

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

    await tx.delete(cardTags).where(eq(cardTags.cardId, lockedCard.id));

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

  const tagMap = await listTagsForCards(db, {
    ownerId: input.ownerId,
    cardIds: [card.id],
  });

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
    tags: tagMap.get(card.id) ?? [],
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
  tags?: string[];
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

  if (input.tags && input.tags.length > 0) {
    const matchingTags = db
      .select({ one: sql`1` })
      .from(cardTags)
      .innerJoin(tags, eq(tags.id, cardTags.tagId))
      .where(
        and(
          eq(cardTags.cardId, cards.id),
          eq(tags.ownerId, input.ownerId),
          isNull(tags.deletedAt),
          inArray(tags.normalizedName, input.tags),
        ),
      );
    filters.push(sql`EXISTS ${matchingTags}`);
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
  const baseItems = hasMore ? rows.slice(0, input.limit) : rows;
  const lastItem = baseItems.at(-1);

  const tagMap = await listTagsForCards(db, {
    ownerId: input.ownerId,
    cardIds: baseItems.map((row) => row.id),
  });

  const items = baseItems.map((row) => ({
    ...row,
    tags: tagMap.get(row.id) ?? [],
  }));

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

export async function listCardsByColumn(input: {
  ownerId: string;
  columnId: string;
  priority?: CardPriority | CardPriority[];
  limit: number;
  cursor?: {
    position: string;
    cardId: string;
  } | null;
}): Promise<{
  items: CardListItemRow[];
  nextCursor: { position: string; cardId: string } | null;
}> {
  const ownedColumn = await getOwnedColumn(db, {
    ownerId: input.ownerId,
    columnId: input.columnId,
  });
  if (!ownedColumn) {
    throw trpcErrors.notFound("Column not found");
  }

  const filters = [eq(cards.columnId, ownedColumn.id), isNull(cards.deletedAt)];

  if (input.priority !== undefined) {
    if (Array.isArray(input.priority)) {
      if (input.priority.length === 0) {
        return { items: [], nextCursor: null };
      }
      filters.push(inArray(cards.priority, input.priority));
    } else {
      filters.push(eq(cards.priority, input.priority));
    }
  }

  if (input.cursor) {
    filters.push(
      or(
        sql`${cards.position} > ${input.cursor.position}`,
        and(eq(cards.position, input.cursor.position), sql`${cards.id} > ${input.cursor.cardId}`),
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
    .where(and(...filters))
    .orderBy(asc(cards.position), asc(cards.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const baseItems = hasMore ? rows.slice(0, input.limit) : rows;
  const lastItem = baseItems.at(-1);

  const tagMap = await listTagsForCards(db, {
    ownerId: input.ownerId,
    cardIds: baseItems.map((row) => row.id),
  });

  const items = baseItems.map((row) => ({
    ...row,
    tags: tagMap.get(row.id) ?? [],
  }));

  return {
    items,
    nextCursor: hasMore && lastItem ? { position: lastItem.position, cardId: lastItem.id } : null,
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

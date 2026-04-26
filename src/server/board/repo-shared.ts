import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { boards, cards, cardTags, columns, tags } from "../db/schema";

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DatabaseExecutor = typeof db | DatabaseTransaction;

export async function getOwnedBoard(
  executor: DatabaseExecutor,
  input: { ownerId: string; boardId: string },
) {
  const [row] = await executor
    .select({
      id: boards.id,
      ownerId: boards.ownerId,
      name: boards.name,
      updatedAt: boards.updatedAt,
    })
    .from(boards)
    .where(
      and(
        eq(boards.id, input.boardId),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function getOwnedColumn(
  executor: DatabaseExecutor,
  input: { ownerId: string; columnId: string },
) {
  const [row] = await executor
    .select({
      id: columns.id,
      boardId: columns.boardId,
      title: columns.title,
      position: columns.position,
      version: columns.version,
      updatedAt: columns.updatedAt,
    })
    .from(columns)
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(
      and(
        eq(columns.id, input.columnId),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
        isNull(columns.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function getOwnedCard(
  executor: DatabaseExecutor,
  input: { ownerId: string; cardId: string },
) {
  const [row] = await executor
    .select({
      id: cards.id,
      boardId: boards.id,
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
        eq(cards.id, input.cardId),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
        isNull(columns.deletedAt),
        isNull(cards.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function lockOwnedColumn(
  tx: DatabaseTransaction,
  input: { ownerId: string; columnId: string },
) {
  const [row] = await tx
    .select({
      id: columns.id,
      boardId: columns.boardId,
      title: columns.title,
      position: columns.position,
      version: columns.version,
      updatedAt: columns.updatedAt,
    })
    .from(columns)
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(
      and(
        eq(columns.id, input.columnId),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
        isNull(columns.deletedAt),
      ),
    )
    .for("update")
    .limit(1);

  return row ?? null;
}

export async function lockOwnedCard(
  tx: DatabaseTransaction,
  input: { ownerId: string; cardId: string },
) {
  const [row] = await tx
    .select({
      id: cards.id,
      boardId: boards.id,
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
        eq(cards.id, input.cardId),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
        isNull(columns.deletedAt),
        isNull(cards.deletedAt),
      ),
    )
    .for("update")
    .limit(1);

  return row ?? null;
}

export async function touchBoard(
  executor: DatabaseExecutor,
  input: { boardId: string; now: Date },
) {
  await executor
    .update(boards)
    .set({ updatedAt: input.now })
    .where(and(eq(boards.id, input.boardId), isNull(boards.deletedAt)));
}

export async function touchCard(executor: DatabaseExecutor, input: { cardId: string; now: Date }) {
  await executor
    .update(cards)
    .set({ updatedAt: input.now })
    .where(and(eq(cards.id, input.cardId), isNull(cards.deletedAt)));
}

export async function listActiveColumnsForBoard(
  executor: DatabaseExecutor,
  input: { boardId: string },
) {
  return executor
    .select({
      id: columns.id,
      position: columns.position,
    })
    .from(columns)
    .where(and(eq(columns.boardId, input.boardId), isNull(columns.deletedAt)))
    .orderBy(asc(columns.position), asc(columns.id));
}

export async function listActiveCardsForColumn(
  executor: DatabaseExecutor,
  input: { columnId: string },
) {
  return executor
    .select({
      id: cards.id,
      position: cards.position,
      updatedAt: cards.updatedAt,
    })
    .from(cards)
    .where(and(eq(cards.columnId, input.columnId), isNull(cards.deletedAt)))
    .orderBy(asc(cards.position), asc(cards.id));
}

export async function getOwnedTag(
  executor: DatabaseExecutor,
  input: { ownerId: string; tagId: string },
) {
  const [row] = await executor
    .select({
      id: tags.id,
      ownerId: tags.ownerId,
      name: tags.name,
      normalizedName: tags.normalizedName,
      version: tags.version,
      updatedAt: tags.updatedAt,
    })
    .from(tags)
    .where(and(eq(tags.id, input.tagId), eq(tags.ownerId, input.ownerId), isNull(tags.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function lockOwnedTag(
  tx: DatabaseTransaction,
  input: { ownerId: string; tagId: string },
) {
  const [row] = await tx
    .select({
      id: tags.id,
      ownerId: tags.ownerId,
      name: tags.name,
      normalizedName: tags.normalizedName,
      version: tags.version,
      updatedAt: tags.updatedAt,
    })
    .from(tags)
    .where(and(eq(tags.id, input.tagId), eq(tags.ownerId, input.ownerId), isNull(tags.deletedAt)))
    .for("update")
    .limit(1);

  return row ?? null;
}

export async function listTagsForCards(
  executor: DatabaseExecutor,
  input: { ownerId: string; cardIds: string[] },
): Promise<Map<string, Array<{ id: string; name: string; normalizedName: string }>>> {
  const result = new Map<string, Array<{ id: string; name: string; normalizedName: string }>>();
  if (input.cardIds.length === 0) return result;

  const rows = await executor
    .select({
      cardId: cardTags.cardId,
      id: tags.id,
      name: tags.name,
      normalizedName: tags.normalizedName,
      createdAt: cardTags.createdAt,
    })
    .from(cardTags)
    .innerJoin(tags, eq(tags.id, cardTags.tagId))
    .where(
      and(
        inArray(cardTags.cardId, input.cardIds),
        eq(tags.ownerId, input.ownerId),
        isNull(tags.deletedAt),
      ),
    )
    .orderBy(asc(cardTags.createdAt), asc(tags.id));

  for (const row of rows) {
    const list = result.get(row.cardId) ?? [];
    list.push({ id: row.id, name: row.name, normalizedName: row.normalizedName });
    result.set(row.cardId, list);
  }

  return result;
}

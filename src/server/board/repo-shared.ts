import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { boards, cards, cardSubtasks, columns } from "../db/schema";

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

export async function getOwnedSubtask(
  executor: DatabaseExecutor,
  input: { ownerId: string; subtaskId: string },
) {
  const [row] = await executor
    .select({
      id: cardSubtasks.id,
      boardId: boards.id,
      columnId: columns.id,
      cardId: cardSubtasks.cardId,
      title: cardSubtasks.title,
      isDone: cardSubtasks.isDone,
      position: cardSubtasks.position,
      version: cardSubtasks.version,
      updatedAt: cardSubtasks.updatedAt,
    })
    .from(cardSubtasks)
    .innerJoin(cards, eq(cardSubtasks.cardId, cards.id))
    .innerJoin(columns, eq(cards.columnId, columns.id))
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(
      and(
        eq(cardSubtasks.id, input.subtaskId),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
        isNull(columns.deletedAt),
        isNull(cards.deletedAt),
        isNull(cardSubtasks.deletedAt),
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

export async function lockOwnedSubtask(
  tx: DatabaseTransaction,
  input: { ownerId: string; subtaskId: string },
) {
  const [row] = await tx
    .select({
      id: cardSubtasks.id,
      boardId: boards.id,
      columnId: columns.id,
      cardId: cardSubtasks.cardId,
      title: cardSubtasks.title,
      isDone: cardSubtasks.isDone,
      position: cardSubtasks.position,
      version: cardSubtasks.version,
      updatedAt: cardSubtasks.updatedAt,
    })
    .from(cardSubtasks)
    .innerJoin(cards, eq(cardSubtasks.cardId, cards.id))
    .innerJoin(columns, eq(cards.columnId, columns.id))
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(
      and(
        eq(cardSubtasks.id, input.subtaskId),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
        isNull(columns.deletedAt),
        isNull(cards.deletedAt),
        isNull(cardSubtasks.deletedAt),
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

export async function listActiveSubtasksForCard(
  executor: DatabaseExecutor,
  input: { cardId: string },
) {
  return executor
    .select({
      id: cardSubtasks.id,
      position: cardSubtasks.position,
    })
    .from(cardSubtasks)
    .where(and(eq(cardSubtasks.cardId, input.cardId), isNull(cardSubtasks.deletedAt)))
    .orderBy(asc(cardSubtasks.position), asc(cardSubtasks.id));
}

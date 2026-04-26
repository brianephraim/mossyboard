import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { keyBetween } from "../../lib/ordering/key-between";
import { db } from "../db/client";
import { boards, cards, cardSubtasks, columns, type CardPriority } from "../db/schema";
import { getOwnedBoard } from "./repo-shared";

const DEFAULT_COLUMN_TITLES = ["To do", "In progress", "Done"] as const;

export type BoardSummaryRow = {
  id: string;
  name: string;
  updatedAt: Date;
  columnCount: number;
  cardCount: number;
};

export type LoadedBoardRow = {
  id: string;
  name: string;
  updatedAt: Date;
  columnCount: number;
  cardCount: number;
  columns: Array<{
    id: string;
    title: string;
    position: string;
    version: number;
    cardCount: number;
    cards: Array<{
      id: string;
      title: string;
      description: string;
      priority: CardPriority;
      position: string;
      version: number;
    }>;
  }>;
};

export async function listBoards(input: { ownerId: string }): Promise<BoardSummaryRow[]> {
  const rows = await db
    .select({
      id: boards.id,
      name: boards.name,
      updatedAt: boards.updatedAt,
      columnCount: sql<number>`count(distinct ${columns.id})`,
      cardCount: sql<number>`count(distinct ${cards.id})`,
    })
    .from(boards)
    .leftJoin(columns, and(eq(columns.boardId, boards.id), isNull(columns.deletedAt)))
    .leftJoin(cards, and(eq(cards.columnId, columns.id), isNull(cards.deletedAt)))
    .where(and(eq(boards.ownerId, input.ownerId), isNull(boards.deletedAt)))
    .groupBy(boards.id)
    .orderBy(desc(boards.updatedAt), asc(boards.id));

  return rows.map((row) => ({
    ...row,
    columnCount: Number(row.columnCount),
    cardCount: Number(row.cardCount),
  }));
}

export async function createBoard(input: {
  ownerId: string;
  name: string;
}): Promise<{ id: string; name: string; updatedAt: Date }> {
  const boardId = randomUUID();
  const now = new Date();
  const starterColumns = buildStarterColumns(boardId, now);

  return db.transaction(async (tx) => {
    const [createdBoard] = await tx
      .insert(boards)
      .values({
        id: boardId,
        ownerId: input.ownerId,
        name: input.name,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: boards.id,
        name: boards.name,
        updatedAt: boards.updatedAt,
      });

    if (!createdBoard) {
      throw new Error("Failed to create board");
    }

    await tx.insert(columns).values(starterColumns);

    return createdBoard;
  });
}

export async function getBoardWithColumnsAndCards(input: {
  ownerId: string;
  boardId: string;
}): Promise<LoadedBoardRow | null> {
  const [boardRow] = await db
    .select({
      id: boards.id,
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

  if (!boardRow) {
    return null;
  }

  const columnRows = await db
    .select({
      id: columns.id,
      title: columns.title,
      position: columns.position,
      version: columns.version,
    })
    .from(columns)
    .where(and(eq(columns.boardId, input.boardId), isNull(columns.deletedAt)))
    .orderBy(asc(columns.position), asc(columns.id));

  const columnIds = columnRows.map((column) => column.id);
  const cardRows =
    columnIds.length === 0
      ? []
      : await db
          .select({
            id: cards.id,
            columnId: cards.columnId,
            title: cards.title,
            description: cards.description,
            priority: cards.priority,
            position: cards.position,
            version: cards.version,
          })
          .from(cards)
          .where(and(inArray(cards.columnId, columnIds), isNull(cards.deletedAt)))
          .orderBy(asc(cards.position), asc(cards.id));

  const cardsByColumn = new Map<string, LoadedBoardRow["columns"][number]["cards"]>();

  for (const card of cardRows) {
    const list = cardsByColumn.get(card.columnId) ?? [];
    list.push({
      id: card.id,
      title: card.title,
      description: card.description,
      priority: card.priority,
      position: card.position,
      version: card.version,
    });
    cardsByColumn.set(card.columnId, list);
  }

  const loadedColumns = columnRows.map((column) => {
    const columnCards = cardsByColumn.get(column.id) ?? [];
    return {
      id: column.id,
      title: column.title,
      position: column.position,
      version: column.version,
      cardCount: columnCards.length,
      cards: columnCards,
    };
  });

  return {
    id: boardRow.id,
    name: boardRow.name,
    updatedAt: boardRow.updatedAt,
    columnCount: loadedColumns.length,
    cardCount: cardRows.length,
    columns: loadedColumns,
  };
}

function buildStarterColumns(boardId: string, now: Date) {
  const positions: string[] = [];
  let previous: string | null = null;

  for (let index = 0; index < DEFAULT_COLUMN_TITLES.length; index += 1) {
    const nextPosition = keyBetween(previous, null);
    positions.push(nextPosition);
    previous = nextPosition;
  }

  return DEFAULT_COLUMN_TITLES.map((title, index) => ({
    id: randomUUID(),
    boardId,
    title,
    position: positions[index] ?? keyBetween(null, null),
    version: 0,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function renameBoard(input: {
  ownerId: string;
  boardId: string;
  name: string;
}): Promise<{ id: string; name: string; updatedAt: Date } | null> {
  const now = new Date();
  const [updated] = await db
    .update(boards)
    .set({
      name: input.name,
      updatedAt: now,
    })
    .where(
      and(
        eq(boards.id, input.boardId),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
      ),
    )
    .returning({
      id: boards.id,
      name: boards.name,
      updatedAt: boards.updatedAt,
    });

  return updated ?? null;
}

export async function softDeleteBoard(input: {
  ownerId: string;
  boardId: string;
}): Promise<{ id: string; deletedAt: Date } | null> {
  return db.transaction(async (tx) => {
    const ownedBoard = await getOwnedBoard(tx, input);
    if (!ownedBoard) {
      return null;
    }

    const now = new Date();
    const [deletedBoard] = await tx
      .update(boards)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(eq(boards.id, input.boardId), isNull(boards.deletedAt)))
      .returning({
        id: boards.id,
        deletedAt: boards.deletedAt,
      });

    if (!deletedBoard?.deletedAt) {
      throw new Error("Failed to soft-delete board");
    }
    const deletedAt = deletedBoard.deletedAt;

    const activeColumns = await tx
      .select({ id: columns.id })
      .from(columns)
      .where(and(eq(columns.boardId, input.boardId), isNull(columns.deletedAt)));
    const activeColumnIds = activeColumns.map((column) => column.id);

    if (activeColumnIds.length > 0) {
      await tx
        .update(columns)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(and(inArray(columns.id, activeColumnIds), isNull(columns.deletedAt)));

      const activeCards = await tx
        .select({ id: cards.id })
        .from(cards)
        .where(and(inArray(cards.columnId, activeColumnIds), isNull(cards.deletedAt)));
      const activeCardIds = activeCards.map((card) => card.id);

      if (activeCardIds.length > 0) {
        await tx
          .update(cards)
          .set({
            deletedAt: now,
            updatedAt: now,
          })
          .where(and(inArray(cards.id, activeCardIds), isNull(cards.deletedAt)));

        await tx
          .update(cardSubtasks)
          .set({
            deletedAt: now,
            updatedAt: now,
          })
          .where(and(inArray(cardSubtasks.cardId, activeCardIds), isNull(cardSubtasks.deletedAt)));
      }
    }

    return { id: deletedBoard.id, deletedAt };
  });
}

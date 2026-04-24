import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { keyBetween } from "../../lib/ordering/key-between";
import { db } from "../db/client";
import { boards, cards, columns } from "../db/schema";

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

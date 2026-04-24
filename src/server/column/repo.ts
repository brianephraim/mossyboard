import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { columns } from "../db/schema";
import { resolveOrderedPosition } from "../board/ordered-position";
import {
  getOwnedBoard,
  listActiveColumnsForBoard,
  lockOwnedColumn,
  touchBoard,
} from "../board/repo-shared";
import { trpcErrors } from "../trpc/init";

export async function createColumn(input: {
  ownerId: string;
  boardId: string;
  title: string;
  prevColumnId?: string | null;
  nextColumnId?: string | null;
}): Promise<{ id: string }> {
  const board = await getOwnedBoard(db, {
    ownerId: input.ownerId,
    boardId: input.boardId,
  });
  if (!board) {
    throw trpcErrors.notFound("Board not found");
  }

  const orderedColumns = await listActiveColumnsForBoard(db, {
    boardId: board.id,
  });
  const position = resolveOrderedPosition(orderedColumns, {
    prevId: input.prevColumnId,
    nextId: input.nextColumnId,
    entityLabel: "Column",
  });

  return db.transaction(async (tx) => {
    const now = new Date();
    const columnId = randomUUID();
    const [created] = await tx
      .insert(columns)
      .values({
        id: columnId,
        boardId: board.id,
        title: input.title,
        position,
        version: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: columns.id,
      });

    if (!created) {
      throw new Error("Failed to create column");
    }

    await touchBoard(tx, {
      boardId: board.id,
      now,
    });

    return created;
  });
}

export async function renameColumn(input: {
  ownerId: string;
  columnId: string;
  title: string;
  expectedVersion: number;
}): Promise<{ id: string; version: number; updatedAt: Date } | null> {
  return db.transaction(async (tx) => {
    const lockedColumn = await lockOwnedColumn(tx, {
      ownerId: input.ownerId,
      columnId: input.columnId,
    });
    if (!lockedColumn) {
      return null;
    }

    if (lockedColumn.version !== input.expectedVersion) {
      throw trpcErrors.conflict("Version conflict");
    }

    const now = new Date();
    const [updated] = await tx
      .update(columns)
      .set({
        title: input.title,
        version: lockedColumn.version + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(columns.id, lockedColumn.id),
          eq(columns.version, lockedColumn.version),
          isNull(columns.deletedAt),
        ),
      )
      .returning({
        id: columns.id,
        version: columns.version,
        updatedAt: columns.updatedAt,
      });

    if (!updated) {
      throw trpcErrors.conflict("Version conflict");
    }

    await touchBoard(tx, {
      boardId: lockedColumn.boardId,
      now,
    });

    return updated;
  });
}

export async function reorderColumn(input: {
  ownerId: string;
  columnId: string;
  prevColumnId?: string | null;
  nextColumnId?: string | null;
  expectedVersion: number;
}): Promise<{ id: string; position: string; version: number; updatedAt: Date } | null> {
  return db.transaction(async (tx) => {
    const lockedColumn = await lockOwnedColumn(tx, {
      ownerId: input.ownerId,
      columnId: input.columnId,
    });
    if (!lockedColumn) {
      return null;
    }

    if (lockedColumn.version !== input.expectedVersion) {
      throw trpcErrors.conflict("Version conflict");
    }

    const orderedColumns = await listActiveColumnsForBoard(tx, {
      boardId: lockedColumn.boardId,
    });
    const position = resolveOrderedPosition(orderedColumns, {
      prevId: input.prevColumnId,
      nextId: input.nextColumnId,
      excludedId: lockedColumn.id,
      entityLabel: "Column",
    });

    const now = new Date();
    const [updated] = await tx
      .update(columns)
      .set({
        position,
        version: lockedColumn.version + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(columns.id, lockedColumn.id),
          eq(columns.version, lockedColumn.version),
          isNull(columns.deletedAt),
        ),
      )
      .returning({
        id: columns.id,
        position: columns.position,
        version: columns.version,
        updatedAt: columns.updatedAt,
      });

    if (!updated) {
      throw trpcErrors.conflict("Version conflict");
    }

    await touchBoard(tx, {
      boardId: lockedColumn.boardId,
      now,
    });

    return updated;
  });
}

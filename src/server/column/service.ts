import { trpcErrors } from "../trpc/init";
import { createColumn, renameColumn, reorderColumn } from "./repo";

export async function createColumnForUser(
  ownerId: string,
  input: {
    boardId: string;
    title: string;
    prevColumnId?: string | null;
    nextColumnId?: string | null;
  },
) {
  const created = await createColumn({
    ownerId,
    boardId: input.boardId,
    title: input.title.trim(),
    prevColumnId: input.prevColumnId,
    nextColumnId: input.nextColumnId,
  });

  return {
    columnId: created.id,
  };
}

export async function renameColumnForUser(
  ownerId: string,
  input: {
    columnId: string;
    title: string;
    expectedVersion: number;
  },
) {
  const renamed = await renameColumn({
    ownerId,
    columnId: input.columnId,
    title: input.title.trim(),
    expectedVersion: input.expectedVersion,
  });
  if (!renamed) {
    throw trpcErrors.notFound("Column not found");
  }

  return {
    columnId: renamed.id,
    version: renamed.version,
    updatedAt: renamed.updatedAt.toISOString(),
  };
}

export async function reorderColumnForUser(
  ownerId: string,
  input: {
    columnId: string;
    prevColumnId?: string | null;
    nextColumnId?: string | null;
    expectedVersion: number;
  },
) {
  const reordered = await reorderColumn({
    ownerId,
    columnId: input.columnId,
    prevColumnId: input.prevColumnId,
    nextColumnId: input.nextColumnId,
    expectedVersion: input.expectedVersion,
  });
  if (!reordered) {
    throw trpcErrors.notFound("Column not found");
  }

  return {
    columnId: reordered.id,
    position: reordered.position,
    version: reordered.version,
    updatedAt: reordered.updatedAt.toISOString(),
  };
}

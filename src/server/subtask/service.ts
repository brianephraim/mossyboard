import { trpcErrors } from "../trpc/init";
import { createSubtask, softDeleteSubtask, toggleSubtask, updateSubtask } from "./repo";

export async function createSubtaskForUser(
  ownerId: string,
  input: {
    cardId: string;
    title: string;
  },
) {
  const created = await createSubtask({
    ownerId,
    cardId: input.cardId,
    title: input.title.trim(),
  });

  return {
    subtaskId: created.id,
  };
}

export async function updateSubtaskForUser(
  ownerId: string,
  input: {
    subtaskId: string;
    title: string;
    expectedVersion: number;
  },
) {
  const updated = await updateSubtask({
    ownerId,
    subtaskId: input.subtaskId,
    title: input.title.trim(),
    expectedVersion: input.expectedVersion,
  });
  if (!updated) {
    throw trpcErrors.notFound("Subtask not found");
  }

  return {
    subtaskId: updated.id,
    version: updated.version,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function toggleSubtaskForUser(
  ownerId: string,
  input: {
    subtaskId: string;
    isDone: boolean;
    expectedVersion: number;
  },
) {
  const updated = await toggleSubtask({
    ownerId,
    subtaskId: input.subtaskId,
    isDone: input.isDone,
    expectedVersion: input.expectedVersion,
  });
  if (!updated) {
    throw trpcErrors.notFound("Subtask not found");
  }

  return {
    subtaskId: updated.id,
    isDone: updated.isDone,
    version: updated.version,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function softDeleteSubtaskForUser(
  ownerId: string,
  input: {
    subtaskId: string;
    expectedVersion: number;
  },
) {
  const deleted = await softDeleteSubtask({
    ownerId,
    subtaskId: input.subtaskId,
    expectedVersion: input.expectedVersion,
  });
  if (!deleted) {
    throw trpcErrors.notFound("Subtask not found");
  }

  return {
    subtaskId: deleted.id,
    deletedAt: deleted.deletedAt.toISOString(),
  };
}

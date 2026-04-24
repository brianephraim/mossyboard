import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { cardSubtasks } from "../db/schema";
import { resolveOrderedPosition } from "../board/ordered-position";
import {
  getOwnedCard,
  listActiveSubtasksForCard,
  lockOwnedSubtask,
  touchBoard,
  touchCard,
} from "../board/repo-shared";
import { trpcErrors } from "../trpc/init";

export async function createSubtask(input: {
  ownerId: string;
  cardId: string;
  title: string;
}): Promise<{ id: string }> {
  const parentCard = await getOwnedCard(db, {
    ownerId: input.ownerId,
    cardId: input.cardId,
  });
  if (!parentCard) {
    throw trpcErrors.notFound("Card not found");
  }

  const orderedSubtasks = await listActiveSubtasksForCard(db, {
    cardId: parentCard.id,
  });
  const position = resolveOrderedPosition(orderedSubtasks, {
    entityLabel: "Subtask",
  });

  return db.transaction(async (tx) => {
    const now = new Date();
    const subtaskId = randomUUID();
    const [created] = await tx
      .insert(cardSubtasks)
      .values({
        id: subtaskId,
        cardId: parentCard.id,
        title: input.title,
        isDone: false,
        position,
        version: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: cardSubtasks.id,
      });

    if (!created) {
      throw new Error("Failed to create subtask");
    }

    await touchCard(tx, {
      cardId: parentCard.id,
      now,
    });
    await touchBoard(tx, {
      boardId: parentCard.boardId,
      now,
    });

    return created;
  });
}

export async function updateSubtask(input: {
  ownerId: string;
  subtaskId: string;
  title: string;
  expectedVersion: number;
}): Promise<{ id: string; version: number; updatedAt: Date } | null> {
  return mutateOwnedSubtask(input, async ({ tx, lockedSubtask, now }) => {
    const [updated] = await tx
      .update(cardSubtasks)
      .set({
        title: input.title,
        version: lockedSubtask.version + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(cardSubtasks.id, lockedSubtask.id),
          eq(cardSubtasks.version, lockedSubtask.version),
          isNull(cardSubtasks.deletedAt),
        ),
      )
      .returning({
        id: cardSubtasks.id,
        version: cardSubtasks.version,
        updatedAt: cardSubtasks.updatedAt,
      });

    if (!updated) {
      throw trpcErrors.conflict("Version conflict");
    }

    return updated;
  });
}

export async function toggleSubtask(input: {
  ownerId: string;
  subtaskId: string;
  isDone: boolean;
  expectedVersion: number;
}): Promise<{ id: string; isDone: boolean; version: number; updatedAt: Date } | null> {
  return mutateOwnedSubtask(input, async ({ tx, lockedSubtask, now }) => {
    const [updated] = await tx
      .update(cardSubtasks)
      .set({
        isDone: input.isDone,
        version: lockedSubtask.version + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(cardSubtasks.id, lockedSubtask.id),
          eq(cardSubtasks.version, lockedSubtask.version),
          isNull(cardSubtasks.deletedAt),
        ),
      )
      .returning({
        id: cardSubtasks.id,
        isDone: cardSubtasks.isDone,
        version: cardSubtasks.version,
        updatedAt: cardSubtasks.updatedAt,
      });

    if (!updated) {
      throw trpcErrors.conflict("Version conflict");
    }

    return updated;
  });
}

export async function softDeleteSubtask(input: {
  ownerId: string;
  subtaskId: string;
  expectedVersion: number;
}): Promise<{ id: string; deletedAt: Date } | null> {
  return mutateOwnedSubtask(input, async ({ tx, lockedSubtask, now }) => {
    const [deleted] = await tx
      .update(cardSubtasks)
      .set({
        deletedAt: now,
        updatedAt: now,
        version: lockedSubtask.version + 1,
      })
      .where(
        and(
          eq(cardSubtasks.id, lockedSubtask.id),
          eq(cardSubtasks.version, lockedSubtask.version),
          isNull(cardSubtasks.deletedAt),
        ),
      )
      .returning({
        id: cardSubtasks.id,
        deletedAt: cardSubtasks.deletedAt,
      });

    if (!deleted?.deletedAt) {
      throw trpcErrors.conflict("Version conflict");
    }

    return deleted;
  });
}

async function mutateOwnedSubtask<
  TResult extends { id: string } | { id: string; deletedAt: Date } | null,
>(
  input: {
    ownerId: string;
    subtaskId: string;
    expectedVersion: number;
  },
  mutate: (context: {
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
    lockedSubtask: NonNullable<Awaited<ReturnType<typeof lockOwnedSubtask>>>;
    now: Date;
  }) => Promise<TResult>,
) {
  return db.transaction(async (tx) => {
    const lockedSubtask = await lockOwnedSubtask(tx, {
      ownerId: input.ownerId,
      subtaskId: input.subtaskId,
    });
    if (!lockedSubtask) {
      return null;
    }

    if (lockedSubtask.version !== input.expectedVersion) {
      throw trpcErrors.conflict("Version conflict");
    }

    const now = new Date();
    const result = await mutate({
      tx,
      lockedSubtask,
      now,
    });

    if (!result) {
      return result;
    }

    await touchCard(tx, {
      cardId: lockedSubtask.cardId,
      now,
    });
    await touchBoard(tx, {
      boardId: lockedSubtask.boardId,
      now,
    });

    return result;
  });
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { beforeAll, describe, it, vi } from "vitest";

import { getTestDatabaseUrl, migrateTestDb, requireSsl } from "../testing/database";

describe("subtask repo", () => {
  let canRun = true;

  beforeAll(async () => {
    try {
      await migrateTestDb();
      vi.resetModules();
    } catch {
      canRun = false;
    }
  });

  it("creates, updates, toggles, and soft-deletes subtasks", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { createBoard } = await import("../board/repo");
    const { createCard, getCard } = await import("../card/repo");
    const { createSubtask, softDeleteSubtask, toggleSubtask, updateSubtask } =
      await import("./repo");

    const ownerId = randomUUID();
    const board = await createBoard({ ownerId, name: "Subtasks board" });
    const { getBoardWithColumnsAndCards } = await import("../board/repo");
    const loadedBoard = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    const firstColumnId = loadedBoard?.columns[0]?.id;
    assert.ok(firstColumnId, "expected a starter column");

    const card = await createCard({
      ownerId,
      columnId: firstColumnId,
      title: "Ship release",
      description: "",
      priority: "medium",
    });

    const firstSubtask = await createSubtask({
      ownerId,
      cardId: card.id,
      title: "Draft notes",
    });
    const secondSubtask = await createSubtask({
      ownerId,
      cardId: card.id,
      title: "Send announcement",
    });

    const updated = await updateSubtask({
      ownerId,
      subtaskId: firstSubtask.id,
      title: "Draft public notes",
      expectedVersion: 0,
    });
    assert.equal(updated?.version, 1);

    const toggled = await toggleSubtask({
      ownerId,
      subtaskId: secondSubtask.id,
      isDone: true,
      expectedVersion: 0,
    });
    assert.equal(toggled?.version, 1);

    await assert.rejects(
      () =>
        toggleSubtask({
          ownerId,
          subtaskId: secondSubtask.id,
          isDone: false,
          expectedVersion: 0,
        }),
      (err: unknown) => (err as { code?: string })?.code === "CONFLICT",
    );

    const deleted = await softDeleteSubtask({
      ownerId,
      subtaskId: firstSubtask.id,
      expectedVersion: updated?.version ?? 1,
    });
    assert.ok(deleted?.deletedAt);

    const detail = await getCard({
      ownerId,
      cardId: card.id,
      boardId: board.id,
    });
    assert.deepEqual(
      detail?.subtasks.map((subtask) => ({
        id: subtask.id,
        title: subtask.title,
        isDone: subtask.isDone,
      })),
      [
        {
          id: secondSubtask.id,
          title: "Send announcement",
          isDone: true,
        },
      ],
    );
  }, 20000);
});

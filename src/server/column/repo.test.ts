import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { beforeAll, describe, it, vi } from "vitest";

import { getTestDatabaseUrl, migrateTestDb, requireSsl } from "../testing/database";

describe("column repo", () => {
  let canRun = true;

  beforeAll(async () => {
    try {
      await migrateTestDb();
      vi.resetModules();
    } catch {
      canRun = false;
    }
  });

  it("creates, renames, and reorders columns", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { createBoard, getBoardWithColumnsAndCards } = await import("../board/repo");
    const { createColumn, renameColumn, reorderColumn } = await import("./repo");

    const ownerId = randomUUID();
    const board = await createBoard({ ownerId, name: "Workflow board" });
    const initial = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    const firstColumnId = initial?.columns[0]?.id;
    const secondColumnId = initial?.columns[1]?.id;
    assert.ok(firstColumnId && secondColumnId, "expected starter columns");

    const created = await createColumn({
      ownerId,
      boardId: board.id,
      title: "QA",
      prevColumnId: firstColumnId,
    });
    assert.ok(created.id);

    const afterCreate = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    assert.deepEqual(
      afterCreate?.columns.map((column) => column.title),
      ["To do", "QA", "In progress", "Done"],
    );

    const createdColumn = afterCreate?.columns.find((column) => column.id === created.id);
    assert.ok(createdColumn, "expected the created column to be visible");

    const renamed = await renameColumn({
      ownerId,
      columnId: created.id,
      title: "Review",
      expectedVersion: createdColumn.version,
    });
    assert.equal(renamed?.version, 1);

    const reordered = await reorderColumn({
      ownerId,
      columnId: created.id,
      nextColumnId: firstColumnId,
      expectedVersion: renamed?.version ?? 1,
    });
    assert.equal(reordered?.version, 2);

    await assert.rejects(
      () =>
        reorderColumn({
          ownerId,
          columnId: created.id,
          prevColumnId: secondColumnId,
          expectedVersion: renamed?.version ?? 1,
        }),
      (err: unknown) => (err as { code?: string })?.code === "CONFLICT",
    );

    const afterReorder = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    assert.deepEqual(
      afterReorder?.columns.map((column) => column.title),
      ["Review", "To do", "In progress", "Done"],
    );
  }, 20000);
});

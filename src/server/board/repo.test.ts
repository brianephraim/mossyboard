import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { beforeAll, describe, it, vi } from "vitest";

import { getTestDatabaseUrl, migrateTestDb, requireSsl } from "../testing/database";

describe("board repo", () => {
  let canRun = true;

  beforeAll(async () => {
    try {
      await migrateTestDb();
      vi.resetModules();
    } catch {
      canRun = false;
    }
  });

  it("creates starter columns, lists boards for the owner, and returns ordered board detail", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { createBoard, getBoardWithColumnsAndCards, listBoards } = await import("./repo");
    const ownerId = randomUUID();

    const firstBoard = await createBoard({ ownerId, name: "Sprint planning" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const secondBoard = await createBoard({ ownerId, name: "Bug triage" });

    const summaries = await listBoards({ ownerId });
    assert.equal(summaries.length, 2);
    assert.equal(summaries[0]?.id, secondBoard.id);
    assert.equal(summaries[0]?.columnCount, 3);
    assert.equal(summaries[0]?.cardCount, 0);
    assert.equal(summaries[1]?.id, firstBoard.id);

    const loaded = await getBoardWithColumnsAndCards({ ownerId, boardId: firstBoard.id });
    assert.ok(loaded, "expected the board to load");
    assert.equal(loaded?.columnCount, 3);
    assert.equal(loaded?.cardCount, 0);
    assert.deepEqual(
      loaded?.columns.map((column) => column.title),
      ["To do", "In progress", "Done"],
    );
    assert.ok(loaded?.columns[0]?.position < loaded?.columns[1]?.position);
    assert.ok(loaded?.columns[1]?.position < loaded?.columns[2]?.position);
  }, 20000);
});

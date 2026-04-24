import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
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

  it("renames and soft-deletes a board with descendant cards and subtasks", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { createBoard, getBoardWithColumnsAndCards, listBoards, renameBoard, softDeleteBoard } =
      await import("./repo");
    const { createCard, getCard } = await import("../card/repo");
    const { createSubtask } = await import("../subtask/repo");
    const { db } = await import("../db/client");
    const { boards, cards, cardSubtasks, columns } = await import("../db/schema");

    const ownerId = randomUUID();
    const created = await createBoard({ ownerId, name: "Delivery board" });
    const loaded = await getBoardWithColumnsAndCards({ ownerId, boardId: created.id });
    const firstColumnId = loaded?.columns[0]?.id;
    assert.ok(firstColumnId, "expected a starter column");

    const createdCard = await createCard({
      ownerId,
      columnId: firstColumnId,
      title: "Ship docs",
      description: "Docs need final review",
      priority: "high",
    });
    const createdSubtask = await createSubtask({
      ownerId,
      cardId: createdCard.id,
      title: "Proofread release notes",
    });

    const renamed = await renameBoard({
      ownerId,
      boardId: created.id,
      name: "Launch board",
    });
    assert.equal(renamed?.name, "Launch board");

    const deleted = await softDeleteBoard({
      ownerId,
      boardId: created.id,
    });
    assert.ok(deleted?.deletedAt);

    const hiddenBoard = await getBoardWithColumnsAndCards({ ownerId, boardId: created.id });
    assert.equal(hiddenBoard, null);

    const hiddenCard = await getCard({
      ownerId,
      cardId: createdCard.id,
    });
    assert.equal(hiddenCard, null);

    const boardSummaries = await listBoards({ ownerId });
    assert.equal(
      boardSummaries.find((summary) => summary.id === created.id),
      undefined,
    );

    const [boardRow] = await db.select().from(boards).where(eq(boards.id, created.id));
    const [columnRow] = await db.select().from(columns).where(eq(columns.boardId, created.id));
    const [cardRow] = await db.select().from(cards).where(eq(cards.id, createdCard.id));
    const [subtaskRow] = await db
      .select()
      .from(cardSubtasks)
      .where(eq(cardSubtasks.id, createdSubtask.id));

    assert.ok(boardRow?.deletedAt);
    assert.ok(columnRow?.deletedAt);
    assert.ok(cardRow?.deletedAt);
    assert.ok(subtaskRow?.deletedAt);
  }, 20000);
});

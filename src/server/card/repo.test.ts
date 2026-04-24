import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { beforeAll, describe, it, vi } from "vitest";

import { getTestDatabaseUrl, migrateTestDb, requireSsl } from "../testing/database";

describe("card repo", () => {
  let canRun = true;

  beforeAll(async () => {
    try {
      await migrateTestDb();
      vi.resetModules();
    } catch {
      canRun = false;
    }
  });

  it("creates, updates, lists, and soft-deletes cards with priority-aware reads", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { createBoard, getBoardWithColumnsAndCards } = await import("../board/repo");
    const { createCard, getCard, listCardsByBoard, softDeleteCard, updateCard } =
      await import("./repo");

    const ownerId = randomUUID();
    const board = await createBoard({ ownerId, name: "Delivery board" });
    const loadedBoard = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    const firstColumnId = loadedBoard?.columns[0]?.id;
    assert.ok(firstColumnId, "expected a starter column");

    const firstCard = await createCard({
      ownerId,
      columnId: firstColumnId,
      title: "Plan launch",
      description: "",
      priority: "none",
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const secondCard = await createCard({
      ownerId,
      columnId: firstColumnId,
      title: "Write changelog",
      description: "Draft the release notes",
      priority: "medium",
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const thirdCard = await createCard({
      ownerId,
      columnId: firstColumnId,
      title: "Notify customers",
      description: "Send launch email",
      priority: "high",
    });

    const updatedSecond = await updateCard({
      ownerId,
      cardId: secondCard.id,
      title: "Write public changelog",
      description: "Draft the release notes for customers",
      priority: "high",
      expectedVersion: 0,
    });
    assert.equal(updatedSecond?.version, 1);

    const detail = await getCard({
      ownerId,
      cardId: secondCard.id,
      boardId: board.id,
    });
    assert.equal(detail?.columnId, firstColumnId);
    assert.equal(detail?.priority, "high");
    assert.equal(detail?.subtasks.length, 0);

    const boardDetail = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    const cardSummary = boardDetail?.columns[0]?.cards.find((card) => card.id === secondCard.id);
    assert.equal(cardSummary?.priority, "high");

    const firstPage = await listCardsByBoard({
      ownerId,
      boardId: board.id,
      limit: 2,
      cursor: null,
    });
    assert.equal(firstPage.items.length, 2);
    assert.ok(firstPage.nextCursor, "expected a next cursor");
    assert.deepEqual(
      firstPage.items.map((card) => card.id),
      [secondCard.id, thirdCard.id],
    );

    const secondPage = await listCardsByBoard({
      ownerId,
      boardId: board.id,
      limit: 2,
      cursor: firstPage.nextCursor,
    });
    assert.deepEqual(
      secondPage.items.map((card) => card.id),
      [firstCard.id],
    );

    const filtered = await listCardsByBoard({
      ownerId,
      boardId: board.id,
      priority: ["high"],
      limit: 10,
      cursor: null,
    });
    assert.deepEqual(
      filtered.items.map((card) => card.id),
      [secondCard.id, thirdCard.id],
    );

    const deleted = await softDeleteCard({
      ownerId,
      cardId: firstCard.id,
      expectedVersion: 0,
    });
    assert.ok(deleted?.deletedAt);

    const reloadedBoard = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    assert.equal(reloadedBoard?.cardCount, 2);
    assert.equal(
      reloadedBoard?.columns[0]?.cards.find((card) => card.id === firstCard.id),
      undefined,
    );
  }, 20000);

  it("moves and reorders cards with version conflicts", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { createBoard, getBoardWithColumnsAndCards } = await import("../board/repo");
    const { createCard, moveCard, reorderCard } = await import("./repo");

    const ownerId = randomUUID();
    const board = await createBoard({ ownerId, name: "Reorder board" });
    const loadedBoard = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    const sourceColumnId = loadedBoard?.columns[0]?.id;
    const targetColumnId = loadedBoard?.columns[1]?.id;
    assert.ok(sourceColumnId && targetColumnId, "expected starter columns");

    const firstCard = await createCard({
      ownerId,
      columnId: sourceColumnId,
      title: "A",
      description: "",
      priority: "none",
    });
    const secondCard = await createCard({
      ownerId,
      columnId: sourceColumnId,
      title: "B",
      description: "",
      priority: "none",
    });
    const targetCard = await createCard({
      ownerId,
      columnId: targetColumnId,
      title: "C",
      description: "",
      priority: "none",
    });

    const moved = await moveCard({
      ownerId,
      cardId: secondCard.id,
      targetColumnId,
      nextCardId: targetCard.id,
      expectedVersion: 0,
    });
    assert.equal(moved?.columnId, targetColumnId);
    assert.equal(moved?.version, 1);

    const reordered = await reorderCard({
      ownerId,
      cardId: targetCard.id,
      columnId: targetColumnId,
      prevCardId: secondCard.id,
      expectedVersion: 0,
    });
    assert.equal(reordered?.version, 1);
    assert.ok(reordered?.position);

    await assert.rejects(
      () =>
        reorderCard({
          ownerId,
          cardId: targetCard.id,
          columnId: targetColumnId,
          prevCardId: secondCard.id,
          expectedVersion: 0,
        }),
      (err: unknown) => (err as { code?: string })?.code === "CONFLICT",
    );

    const reloadedBoard = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    assert.deepEqual(
      reloadedBoard?.columns[1]?.cards.map((card) => card.id),
      [secondCard.id, targetCard.id],
    );
    assert.deepEqual(
      reloadedBoard?.columns[0]?.cards.map((card) => card.id),
      [firstCard.id],
    );
  }, 20000);
});

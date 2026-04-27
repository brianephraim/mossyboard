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

  it("moves and reorders cards with priority changes and version conflicts", async () => {
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
      priority: "high",
      nextCardId: targetCard.id,
      expectedVersion: 0,
    });
    assert.equal(moved?.columnId, targetColumnId);
    assert.equal(moved?.version, 1);

    const reordered = await reorderCard({
      ownerId,
      cardId: targetCard.id,
      columnId: targetColumnId,
      priority: "low",
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
      reloadedBoard?.columns[1]?.cards.map((card) => card.priority),
      ["high", "low"],
    );
    assert.deepEqual(
      reloadedBoard?.columns[0]?.cards.map((card) => card.id),
      [firstCard.id],
    );
  }, 20000);

  it("filters cards by tags (OR semantics across the array) and hydrates tag rows", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { createBoard, getBoardWithColumnsAndCards } = await import("../board/repo");
    const { createCard, listCardsByBoard } = await import("./repo");
    const { addTagToCard } = await import("../tag/repo");

    const ownerId = randomUUID();
    const board = await createBoard({ ownerId, name: "Tag filter board" });
    const loadedBoard = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
    const columnId = loadedBoard?.columns[0]?.id;
    assert.ok(columnId, "expected a starter column");

    const c1 = await createCard({
      ownerId,
      columnId,
      title: "C1",
      description: "",
      priority: "none",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const c2 = await createCard({
      ownerId,
      columnId,
      title: "C2",
      description: "",
      priority: "none",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const c3 = await createCard({
      ownerId,
      columnId,
      title: "C3",
      description: "",
      priority: "none",
    });

    await addTagToCard({ ownerId, cardId: c1.id, rawName: "Bug" });
    await addTagToCard({ ownerId, cardId: c2.id, rawName: "Frontend" });

    const both = await listCardsByBoard({
      ownerId,
      boardId: board.id,
      tags: ["bug", "frontend"],
      limit: 50,
      cursor: null,
    });
    assert.deepEqual(both.items.map((row) => row.id).sort(), [c1.id, c2.id].sort());

    const onlyBug = await listCardsByBoard({
      ownerId,
      boardId: board.id,
      tags: ["bug"],
      limit: 50,
      cursor: null,
    });
    assert.deepEqual(
      onlyBug.items.map((row) => row.id),
      [c1.id],
    );
    const taggedRow = onlyBug.items.find((row) => row.id === c1.id);
    assert.deepEqual(
      taggedRow?.tags.map((t) => t.normalizedName),
      ["bug"],
    );

    const noFilter = await listCardsByBoard({
      ownerId,
      boardId: board.id,
      limit: 50,
      cursor: null,
    });
    assert.deepEqual(noFilter.items.map((row) => row.id).sort(), [c1.id, c2.id, c3.id].sort());

    const c3Row = noFilter.items.find((row) => row.id === c3.id);
    assert.deepEqual(c3Row?.tags, []);
  }, 20000);

  describe("listCardsByColumn", () => {
    it("lists cards in position order across priorities (single page)", async () => {
      if (!canRun) return;

      process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

      const { createBoard, getBoardWithColumnsAndCards } = await import("../board/repo");
      const { createCard, listCardsByColumn } = await import("./repo");

      const ownerId = randomUUID();
      const board = await createBoard({ ownerId, name: "Column listing board" });
      const loadedBoard = await getBoardWithColumnsAndCards({ ownerId, boardId: board.id });
      const columnId = loadedBoard?.columns[0]?.id;
      assert.ok(columnId, "expected a starter column");

      const a = await createCard({
        ownerId,
        columnId,
        title: "a",
        description: "",
        priority: "low",
      });
      const b = await createCard({
        ownerId,
        columnId,
        title: "b",
        description: "",
        priority: "low",
      });
      const c = await createCard({
        ownerId,
        columnId,
        title: "c",
        description: "",
        priority: "low",
      });
      const d = await createCard({
        ownerId,
        columnId,
        title: "d",
        description: "",
        priority: "high",
      });
      const e = await createCard({
        ownerId,
        columnId,
        title: "e",
        description: "",
        priority: "high",
      });

      const listed = await listCardsByColumn({ ownerId, columnId, limit: 10 });

      assert.equal(listed.nextCursor, null);
      assert.equal(listed.items.length, 5);
      assert.deepEqual(
        listed.items.map((item) => item.id),
        [a.id, b.id, c.id, d.id, e.id],
      );
      for (let i = 1; i < listed.items.length; i++) {
        const prev = listed.items[i - 1]!;
        const curr = listed.items[i]!;
        assert.ok(
          prev.position < curr.position || (prev.position === curr.position && prev.id < curr.id),
          "expected (position, id) ascending order",
        );
      }
    }, 20000);
  });
});

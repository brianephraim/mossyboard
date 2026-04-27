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

    const { createBoard, getBoardStructure } = await import("../board/repo");
    const { createCard, getCard, listCardsByBoard, listCardsByColumn, softDeleteCard, updateCard } =
      await import("./repo");

    const ownerId = randomUUID();
    const board = await createBoard({ ownerId, name: "Delivery board" });
    const structure = await getBoardStructure({ ownerId, boardId: board.id });
    const firstColumnId = structure?.columns[0]?.id;
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

    const boardDetail = await listCardsByColumn({
      ownerId,
      columnId: firstColumnId,
      limit: 50,
    });
    const cardSummary = boardDetail.items.find((card) => card.id === secondCard.id);
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

    const reloaded = await listCardsByColumn({
      ownerId,
      columnId: firstColumnId,
      limit: 50,
    });
    assert.equal(reloaded.items.length, 2);
    assert.equal(
      reloaded.items.find((card) => card.id === firstCard.id),
      undefined,
    );
  }, 20000);

  it("moves and reorders cards with priority changes and version conflicts", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { createBoard, getBoardStructure } = await import("../board/repo");
    const { createCard, listCardsByColumn, moveCard, reorderCard } = await import("./repo");

    const ownerId = randomUUID();
    const board = await createBoard({ ownerId, name: "Reorder board" });
    const structure = await getBoardStructure({ ownerId, boardId: board.id });
    const sourceColumnId = structure?.columns[0]?.id;
    const targetColumnId = structure?.columns[1]?.id;
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

    const targetCards = await listCardsByColumn({
      ownerId,
      columnId: targetColumnId,
      limit: 50,
    });
    assert.deepEqual(
      targetCards.items.map((card) => card.id),
      [secondCard.id, targetCard.id],
    );
    assert.deepEqual(
      targetCards.items.map((card) => card.priority),
      ["high", "low"],
    );
    const sourceCards = await listCardsByColumn({
      ownerId,
      columnId: sourceColumnId,
      limit: 50,
    });
    assert.deepEqual(
      sourceCards.items.map((card) => card.id),
      [firstCard.id],
    );
  }, 20000);

  it("filters cards by tags (OR semantics across the array) and hydrates tag rows", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { createBoard, getBoardStructure } = await import("../board/repo");
    const { createCard, listCardsByBoard } = await import("./repo");
    const { addTagToCard } = await import("../tag/repo");

    const ownerId = randomUUID();
    const board = await createBoard({ ownerId, name: "Tag filter board" });
    const structure = await getBoardStructure({ ownerId, boardId: board.id });
    const columnId = structure?.columns[0]?.id;
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

      const { createBoard, getBoardStructure } = await import("../board/repo");
      const { createCard, listCardsByColumn } = await import("./repo");

      const ownerId = randomUUID();
      const board = await createBoard({ ownerId, name: "Column listing board" });
      const structure = await getBoardStructure({ ownerId, boardId: board.id });
      const columnId = structure?.columns[0]?.id;
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

    it("paginates through cards using (position, id) cursor", async () => {
      if (!canRun) return;

      process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

      const { createBoard, getBoardStructure } = await import("../board/repo");
      const { createCard, listCardsByColumn } = await import("./repo");

      const ownerId = randomUUID();
      const board = await createBoard({ ownerId, name: "Cursor pagination board" });
      const structure = await getBoardStructure({ ownerId, boardId: board.id });
      const columnId = structure?.columns[0]?.id;
      assert.ok(columnId, "expected a starter column");

      const seeded: Array<{ id: string }> = [];
      for (let i = 0; i < 7; i++) {
        seeded.push(
          await createCard({
            ownerId,
            columnId,
            title: `card-${i}`,
            description: "",
            priority: "none",
          }),
        );
      }

      const page1 = await listCardsByColumn({ ownerId, columnId, limit: 3 });
      assert.equal(page1.items.length, 3);
      assert.deepEqual(
        page1.items.map((row) => row.id),
        seeded.slice(0, 3).map((row) => row.id),
      );
      const page1Last = page1.items[2]!;
      assert.deepEqual(page1.nextCursor, {
        position: page1Last.position,
        cardId: page1Last.id,
      });

      const page2 = await listCardsByColumn({
        ownerId,
        columnId,
        limit: 3,
        cursor: page1.nextCursor,
      });
      assert.equal(page2.items.length, 3);
      assert.deepEqual(
        page2.items.map((row) => row.id),
        seeded.slice(3, 6).map((row) => row.id),
      );
      const page2Last = page2.items[2]!;
      assert.deepEqual(page2.nextCursor, {
        position: page2Last.position,
        cardId: page2Last.id,
      });

      const page3 = await listCardsByColumn({
        ownerId,
        columnId,
        limit: 3,
        cursor: page2.nextCursor,
      });
      assert.equal(page3.items.length, 1);
      assert.equal(page3.items[0]!.id, seeded[6]!.id);
      assert.equal(page3.nextCursor, null);
    }, 20000);

    it("filters to a single priority value", async () => {
      if (!canRun) return;

      process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

      const { createBoard, getBoardStructure } = await import("../board/repo");
      const { createCard, listCardsByColumn } = await import("./repo");

      const ownerId = randomUUID();
      const board = await createBoard({ ownerId, name: "Single priority filter board" });
      const structure = await getBoardStructure({ ownerId, boardId: board.id });
      const columnId = structure?.columns[0]?.id;
      assert.ok(columnId, "expected a starter column");

      const interleaved: Array<{ priority: "high" | "medium" | "low" }> = [
        { priority: "high" },
        { priority: "medium" },
        { priority: "low" },
        { priority: "high" },
        { priority: "medium" },
        { priority: "low" },
      ];
      const seeded: Array<{ id: string; priority: "high" | "medium" | "low" }> = [];
      for (const spec of interleaved) {
        const created = await createCard({
          ownerId,
          columnId,
          title: `c-${spec.priority}-${seeded.length}`,
          description: "",
          priority: spec.priority,
        });
        seeded.push({ id: created.id, priority: spec.priority });
      }

      const onlyHigh = await listCardsByColumn({
        ownerId,
        columnId,
        priority: "high",
        limit: 10,
      });
      assert.equal(onlyHigh.nextCursor, null);
      const expectedHighIds = seeded.filter((row) => row.priority === "high").map((row) => row.id);
      assert.deepEqual(
        onlyHigh.items.map((row) => row.id),
        expectedHighIds,
      );
      assert.deepEqual(
        onlyHigh.items.map((row) => row.priority),
        ["high", "high"],
      );
    }, 20000);

    it("filters to a list of priorities and short-circuits on empty list", async () => {
      if (!canRun) return;

      process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

      const { createBoard, getBoardStructure } = await import("../board/repo");
      const { createCard, listCardsByColumn } = await import("./repo");

      const ownerId = randomUUID();
      const board = await createBoard({ ownerId, name: "Priority list filter board" });
      const structure = await getBoardStructure({ ownerId, boardId: board.id });
      const columnId = structure?.columns[0]?.id;
      assert.ok(columnId, "expected a starter column");

      const interleaved: Array<{ priority: "high" | "medium" | "low" }> = [
        { priority: "high" },
        { priority: "medium" },
        { priority: "low" },
        { priority: "high" },
        { priority: "medium" },
        { priority: "low" },
      ];
      const seeded: Array<{ id: string; priority: "high" | "medium" | "low" }> = [];
      for (const spec of interleaved) {
        const created = await createCard({
          ownerId,
          columnId,
          title: `c-${spec.priority}-${seeded.length}`,
          description: "",
          priority: spec.priority,
        });
        seeded.push({ id: created.id, priority: spec.priority });
      }

      const highMedium = await listCardsByColumn({
        ownerId,
        columnId,
        priority: ["high", "medium"],
        limit: 10,
      });
      assert.equal(highMedium.nextCursor, null);
      const expectedIds = seeded
        .filter((row) => row.priority === "high" || row.priority === "medium")
        .map((row) => row.id);
      assert.deepEqual(
        highMedium.items.map((row) => row.id),
        expectedIds,
      );

      const empty = await listCardsByColumn({
        ownerId,
        columnId,
        priority: [],
        limit: 10,
      });
      assert.deepEqual(empty, { items: [], nextCursor: null });
    }, 20000);

    it("rejects with NOT_FOUND when called by a different owner", async () => {
      if (!canRun) return;

      process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

      const { createBoard, getBoardStructure } = await import("../board/repo");
      const { createCard, listCardsByColumn } = await import("./repo");

      const ownerA = randomUUID();
      const ownerB = randomUUID();
      const board = await createBoard({ ownerId: ownerA, name: "Owner A board" });
      const structure = await getBoardStructure({
        ownerId: ownerA,
        boardId: board.id,
      });
      const columnId = structure?.columns[0]?.id;
      assert.ok(columnId, "expected a starter column");

      for (let i = 0; i < 3; i++) {
        await createCard({
          ownerId: ownerA,
          columnId,
          title: `a-${i}`,
          description: "",
          priority: "none",
        });
      }

      await assert.rejects(
        () => listCardsByColumn({ ownerId: ownerB, columnId, limit: 10 }),
        (err: unknown) => (err as { code?: string })?.code === "NOT_FOUND",
      );
    }, 20000);

    it("excludes soft-deleted cards", async () => {
      if (!canRun) return;

      process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

      const { createBoard, getBoardStructure } = await import("../board/repo");
      const { createCard, listCardsByColumn } = await import("./repo");
      const { db } = await import("../db/client");
      const { cards } = await import("../db/schema");
      const { eq } = await import("drizzle-orm");

      const ownerId = randomUUID();
      const board = await createBoard({ ownerId, name: "Soft delete board" });
      const structure = await getBoardStructure({ ownerId, boardId: board.id });
      const columnId = structure?.columns[0]?.id;
      assert.ok(columnId, "expected a starter column");

      const seeded: Array<{ id: string }> = [];
      for (let i = 0; i < 3; i++) {
        seeded.push(
          await createCard({
            ownerId,
            columnId,
            title: `s-${i}`,
            description: "",
            priority: "none",
          }),
        );
      }

      await db.update(cards).set({ deletedAt: new Date() }).where(eq(cards.id, seeded[1]!.id));

      const listed = await listCardsByColumn({ ownerId, columnId, limit: 10 });
      assert.equal(listed.nextCursor, null);
      assert.equal(listed.items.length, 2);
      assert.deepEqual(
        listed.items.map((row) => row.id),
        [seeded[0]!.id, seeded[2]!.id],
      );
    }, 20000);
  });
});

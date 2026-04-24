import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

import { eq } from "drizzle-orm";
import { beforeAll, describe, it, vi } from "vitest";

async function migrateTestDb() {
  process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

  const result = spawnSync("npm", ["run", "db:migrate"], {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      ["db:migrate failed for test DB", result.stdout?.trim(), result.stderr?.trim()]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function getTestDatabaseUrl() {
  const testUrl = process.env.DATABASE_URL_TEST_POOLER ?? process.env.DATABASE_URL_TEST;
  assert.ok(testUrl, "DATABASE_URL_TEST must be set");
  return testUrl;
}

function requireSsl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("sslmode")) parsed.searchParams.set("sslmode", "require");
    return parsed.toString();
  } catch {
    return url;
  }
}

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
  });

  it("filters deleted cards and hides missing or foreign-owned boards", async () => {
    if (!canRun) return;

    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

    const { keyBetween } = await import("../../lib/ordering/key-between");
    const { db } = await import("../db/client");
    const { boards, cards } = await import("../db/schema");
    const { createBoard, getBoardWithColumnsAndCards, listBoards } = await import("./repo");

    const ownerId = randomUUID();
    const otherOwnerId = randomUUID();
    const created = await createBoard({ ownerId, name: "Delivery board" });
    const loaded = await getBoardWithColumnsAndCards({ ownerId, boardId: created.id });
    assert.ok(loaded, "expected the created board to load");

    const firstColumnId = loaded?.columns[0]?.id;
    assert.ok(firstColumnId, "expected a starter column");

    const firstCardPosition = keyBetween(null, null);
    const secondCardPosition = keyBetween(firstCardPosition, null);
    const now = new Date();

    await db.insert(cards).values([
      {
        id: randomUUID(),
        columnId: firstColumnId,
        title: "Visible card",
        description: "Keep me",
        position: firstCardPosition,
        version: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        columnId: firstColumnId,
        title: "Deleted card",
        description: "Hide me",
        position: secondCardPosition,
        version: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: now,
      },
    ]);

    const reloaded = await getBoardWithColumnsAndCards({ ownerId, boardId: created.id });
    assert.equal(reloaded?.cardCount, 1);
    assert.deepEqual(
      reloaded?.columns[0]?.cards.map((card) => card.title),
      ["Visible card"],
    );

    const foreignBoard = await getBoardWithColumnsAndCards({
      ownerId: otherOwnerId,
      boardId: created.id,
    });
    assert.equal(foreignBoard, null);

    await db.update(boards).set({ deletedAt: new Date() }).where(eq(boards.id, created.id));

    const deletedBoard = await getBoardWithColumnsAndCards({ ownerId, boardId: created.id });
    assert.equal(deletedBoard, null);

    const summaries = await listBoards({ ownerId });
    assert.equal(
      summaries.find((summary) => summary.id === created.id),
      undefined,
    );
  });
});

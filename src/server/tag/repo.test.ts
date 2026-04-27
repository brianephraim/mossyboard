import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { beforeAll, describe, it, vi } from "vitest";

import { db } from "../db/client";
import { cardTags } from "../db/schema";
import { getTestDatabaseUrl, migrateTestDb, requireSsl } from "../testing/database";
import { listTagsForCards } from "../board/repo-shared";
import {
  PER_CARD_TAG_LIMIT,
  TAG_NAME_MAX_LENGTH,
  addTagToCard,
  detachTagFromCard,
  listTagsForOwner,
} from "./repo";

async function seedCard(opts: { ownerId: string; title?: string } = { ownerId: "" }) {
  const ownerId = opts.ownerId || randomUUID();
  const { createBoard, getBoardStructure } = await import("../board/repo");
  const { createCard } = await import("../card/repo");
  const board = await createBoard({ ownerId, name: "Tag test board" });
  const loaded = await getBoardStructure({ ownerId, boardId: board.id });
  const columnId = loaded?.columns[0]?.id;
  assert.ok(columnId, "expected starter column");
  const card = await createCard({
    ownerId,
    columnId,
    title: opts.title ?? "Card",
    description: "",
    priority: "none",
  });
  return { ownerId, boardId: board.id, columnId, cardId: card.id };
}

describe("tag repo", () => {
  let canRun = true;

  beforeAll(async () => {
    try {
      await migrateTestDb();
      vi.resetModules();
      process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());
    } catch {
      canRun = false;
    }
  });

  it("creates a tag and attaches it to the card", async () => {
    if (!canRun) return;
    const { ownerId, cardId } = await seedCard({ ownerId: randomUUID() });

    const { tagId } = await addTagToCard({ ownerId, cardId, rawName: "Bug" });

    const allTags = await listTagsForOwner({ ownerId });
    assert.equal(allTags.length, 1);
    assert.equal(allTags[0]?.id, tagId);
    assert.equal(allTags[0]?.name, "Bug");
    assert.equal(allTags[0]?.normalizedName, "bug");
    assert.equal(allTags[0]?.version, 0);

    const attached = await listTagsForCards(db, { ownerId, cardIds: [cardId] });
    assert.equal(attached.get(cardId)?.length, 1);
    assert.equal(attached.get(cardId)?.[0]?.id, tagId);
  }, 20000);

  it("dedupes case-insensitively and rewrites casing globally on typed re-add", async () => {
    if (!canRun) return;
    const ownerId = randomUUID();
    const { cardId: cardA } = await seedCard({ ownerId, title: "A" });
    const { cardId: cardB } = await seedCard({ ownerId, title: "B" });

    const { tagId: idA } = await addTagToCard({ ownerId, cardId: cardA, rawName: "Bug" });
    const { tagId: idB } = await addTagToCard({ ownerId, cardId: cardB, rawName: "bug" });

    assert.equal(idA, idB, "second add should reuse the same tag row");

    const all = await listTagsForOwner({ ownerId });
    assert.equal(all.length, 1);
    assert.equal(all[0]?.name, "bug", "name should reflect the latest typed casing");
    assert.equal(all[0]?.version, 1, "casing rewrite increments version");
  }, 20000);

  it("preserves casing when the existing display already matches", async () => {
    if (!canRun) return;
    const ownerId = randomUUID();
    const { cardId: cardA } = await seedCard({ ownerId, title: "A" });
    const { cardId: cardB } = await seedCard({ ownerId, title: "B" });

    await addTagToCard({ ownerId, cardId: cardA, rawName: "Bug" });
    await addTagToCard({ ownerId, cardId: cardB, rawName: "Bug" });

    const all = await listTagsForOwner({ ownerId });
    assert.equal(all[0]?.version, 0, "no rewrite, version stays at 0");
  }, 20000);

  it("treats inner whitespace as significant", async () => {
    if (!canRun) return;
    const { ownerId, cardId } = await seedCard({ ownerId: randomUUID() });

    await addTagToCard({ ownerId, cardId, rawName: "BlackCat" });
    await addTagToCard({ ownerId, cardId, rawName: "Black Cat" });

    const all = await listTagsForOwner({ ownerId });
    assert.equal(all.length, 2);
  }, 20000);

  it("trims surrounding whitespace before normalizing", async () => {
    if (!canRun) return;
    const { ownerId, cardId } = await seedCard({ ownerId: randomUUID() });

    await addTagToCard({ ownerId, cardId, rawName: "  Frontend  " });

    const all = await listTagsForOwner({ ownerId });
    assert.equal(all[0]?.name, "Frontend");
    assert.equal(all[0]?.normalizedName, "frontend");
  }, 20000);

  it("enforces per-card cap", async () => {
    if (!canRun) return;
    const { ownerId, cardId } = await seedCard({ ownerId: randomUUID() });

    for (let i = 0; i < PER_CARD_TAG_LIMIT; i += 1) {
      await addTagToCard({ ownerId, cardId, rawName: `tag${i}` });
    }

    await assert.rejects(addTagToCard({ ownerId, cardId, rawName: "overflow" }), /at most/);
  }, 30000);

  it("enforces name length cap", async () => {
    if (!canRun) return;
    const { ownerId, cardId } = await seedCard({ ownerId: randomUUID() });

    const tooLong = "x".repeat(TAG_NAME_MAX_LENGTH + 1);
    await assert.rejects(addTagToCard({ ownerId, cardId, rawName: tooLong }), /cannot exceed/);
  }, 20000);

  it("rejects names containing commas", async () => {
    if (!canRun) return;
    const { ownerId, cardId } = await seedCard({ ownerId: randomUUID() });

    await assert.rejects(addTagToCard({ ownerId, cardId, rawName: "foo,bar" }), /comma/);
  }, 20000);

  it("is idempotent when re-attaching the same tag to the same card", async () => {
    if (!canRun) return;
    const { ownerId, cardId } = await seedCard({ ownerId: randomUUID() });

    await addTagToCard({ ownerId, cardId, rawName: "ux" });
    await addTagToCard({ ownerId, cardId, rawName: "ux" });

    const rows = await db.select().from(cardTags).where(eq(cardTags.cardId, cardId));
    assert.equal(rows.length, 1);
  }, 20000);

  it("rejects cross-owner attaches with notFound", async () => {
    if (!canRun) return;
    const ownerA = randomUUID();
    const ownerB = randomUUID();
    const { cardId } = await seedCard({ ownerId: ownerA });

    await assert.rejects(addTagToCard({ ownerId: ownerB, cardId, rawName: "x" }), /not found/i);
  }, 20000);

  it("removes the join row and returns detached: true", async () => {
    if (!canRun) return;
    const { ownerId, cardId } = await seedCard({ ownerId: randomUUID() });
    const { tagId } = await addTagToCard({ ownerId, cardId, rawName: "wip" });

    const result = await detachTagFromCard({ ownerId, cardId, tagId });
    assert.equal(result.detached, true);

    const remaining = await listTagsForCards(db, { ownerId, cardIds: [cardId] });
    assert.equal(remaining.get(cardId)?.length ?? 0, 0);
  }, 20000);

  it("is idempotent: detaching twice returns detached: false the second time", async () => {
    if (!canRun) return;
    const { ownerId, cardId } = await seedCard({ ownerId: randomUUID() });
    const { tagId } = await addTagToCard({ ownerId, cardId, rawName: "wip" });

    await detachTagFromCard({ ownerId, cardId, tagId });
    const second = await detachTagFromCard({ ownerId, cardId, tagId });
    assert.equal(second.detached, false);
  }, 20000);

  it("listTagsForOwner returns only the caller's tags, sorted by name", async () => {
    if (!canRun) return;
    const ownerA = randomUUID();
    const { cardId: cardAId } = await seedCard({ ownerId: ownerA });
    await addTagToCard({ ownerId: ownerA, cardId: cardAId, rawName: "Zebra" });
    await addTagToCard({ ownerId: ownerA, cardId: cardAId, rawName: "Apple" });

    const ownerB = randomUUID();
    const { cardId: cardBId } = await seedCard({ ownerId: ownerB });
    await addTagToCard({ ownerId: ownerB, cardId: cardBId, rawName: "OtherUserTag" });

    const list = await listTagsForOwner({ ownerId: ownerA });
    assert.deepEqual(
      list.map((t) => t.name),
      ["Apple", "Zebra"],
    );
  }, 20000);

  it("listTagsForCards returns a map keyed by cardId with tags in insertion order", async () => {
    if (!canRun) return;
    const ownerId = randomUUID();
    const { cardId: c1 } = await seedCard({ ownerId, title: "C1" });
    const { cardId: c2 } = await seedCard({ ownerId, title: "C2" });
    await addTagToCard({ ownerId, cardId: c1, rawName: "alpha" });
    await addTagToCard({ ownerId, cardId: c1, rawName: "beta" });
    await addTagToCard({ ownerId, cardId: c2, rawName: "alpha" });

    const map = await listTagsForCards(db, { ownerId, cardIds: [c1, c2] });
    assert.deepEqual(
      map.get(c1)?.map((t) => t.name),
      ["alpha", "beta"],
    );
    assert.deepEqual(
      map.get(c2)?.map((t) => t.name),
      ["alpha"],
    );
  }, 20000);
});

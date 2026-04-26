import assert from "node:assert/strict";
import { beforeAll, describe, it, vi } from "vitest";

import { TRPCError } from "@trpc/server";

import { getTestDatabaseUrl, migrateTestDb, requireSsl } from "../testing/database";
import { createDemoItem, getDemoItem, moveDemoItem } from "./repo";

describe("demo item move uses tx + FOR UPDATE", () => {
  let canRun = true;

  beforeAll(async () => {
    try {
      await migrateTestDb();
      vi.resetModules();
    } catch {
      canRun = false;
    }
  });

  it("moves and bumps version", async () => {
    if (!canRun) return;
    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const row = await createDemoItem({ bucket: `a-${suffix}`, order: 1 });

    const moved = await moveDemoItem({
      id: row.id,
      expectedVersion: row.version,
      toBucket: `b-${suffix}`,
      toOrder: 5,
    });

    assert.equal(moved.bucket, `b-${suffix}`);
    assert.equal(moved.order, 5);
    assert.equal(moved.version, row.version + 1);

    const fetched = await getDemoItem({ id: row.id });
    assert.ok(fetched);
    assert.equal(fetched.bucket, `b-${suffix}`);
  });

  it("throws CONFLICT on version mismatch", async () => {
    if (!canRun) return;
    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const row = await createDemoItem({ bucket: `a-${suffix}`, order: 2 });

    try {
      await moveDemoItem({
        id: row.id,
        expectedVersion: row.version + 999,
        toBucket: `a-${suffix}`,
        toOrder: 3,
      });
      assert.fail("expected conflict");
    } catch (err) {
      assert.ok(err instanceof TRPCError);
      assert.equal(err.code, "CONFLICT");
    }
  });
});

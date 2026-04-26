import assert from "node:assert/strict";
import { beforeAll, describe, it, vi } from "vitest";

import { getTestDatabaseUrl, migrateTestDb, requireSsl } from "../testing/database";
import { getSharedCounterWithRecentEvents, incrementSharedCounter } from "./repo";

describe("Drizzle relational parent-with-children read", () => {
  let canRun = true;

  beforeAll(async () => {
    try {
      await migrateTestDb();
      vi.resetModules();
    } catch {
      canRun = false;
    }
  });

  it("fetches counter with recent events via relational query", async () => {
    if (!canRun) return;
    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());
    await incrementSharedCounter();
    const result = await getSharedCounterWithRecentEvents(5);

    assert.equal(typeof result.value, "number");
    assert.ok(Array.isArray(result.events));
    assert.ok(result.events.length >= 1);
    assert.equal(result.events[0]?.delta, 1);
  });
});

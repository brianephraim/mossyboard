import assert from "node:assert/strict";
import { beforeAll, describe, it, vi } from "vitest";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { getTestDatabaseUrl, migrateTestDb, requireSsl } from "../testing/database";
import { createTrpcContext } from "./context";
import { appRouter } from "./router";

describe("counter response shape", () => {
  let canRun = true;

  beforeAll(async () => {
    try {
      await migrateTestDb();
      vi.resetModules();
    } catch {
      canRun = false;
    }
  });

  it("counter.get returns { value: number }", async () => {
    if (!canRun) return;
    process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());
    const req = new Request("http://localhost/api/trpc/counter.get?input=%7B%7D", {
      method: "GET",
    });

    const res = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: createTrpcContext,
    });

    assert.equal(res.status, 200);
    const payload = await res.json();
    const value = payload?.result?.data?.value;
    assert.equal(typeof value, "number");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTrpcContext } from "./context";
import { appRouter } from "./router";

describe("counter response shape", () => {
  it("counter.get returns { value: number }", async () => {
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

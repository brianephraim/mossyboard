import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTrpcContext } from "./context";
import { appRouter } from "./router";

describe("tRPC error formatting", () => {
  it("surfaces zodError.flatten() for invalid input", async () => {
    const url = new URL("http://localhost/api/trpc/echo");
    url.searchParams.set("input", JSON.stringify({ message: 123 }));

    const req = new Request(url.toString(), { method: "GET" });

    const res = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: createTrpcContext,
    });

    // tRPC returns a non-2xx response for bad inputs on single-call requests.
    assert.ok(res.status >= 400 && res.status < 500);
    const payload = await res.json();
    const zodError = payload?.error?.data?.zodError;
    assert.ok(zodError, "expected zodError in error.data");
    assert.ok(zodError.fieldErrors?.message, "expected zodError.fieldErrors.message");
  });
});

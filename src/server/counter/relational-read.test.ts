import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { getSharedCounterWithRecentEvents, incrementSharedCounter } from "./repo";

describe("Drizzle relational parent-with-children read", () => {
  it("fetches counter with recent events via relational query", async () => {
    await incrementSharedCounter();
    const result = await getSharedCounterWithRecentEvents(5);

    assert.equal(typeof result.value, "number");
    assert.ok(Array.isArray(result.events));
    assert.ok(result.events.length >= 1);
    assert.equal(result.events[0]?.delta, 1);
  });
});

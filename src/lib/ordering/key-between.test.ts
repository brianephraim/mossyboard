import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { keyBetween } from "./key-between";

describe("keyBetween", () => {
  it("creates a middle key when both bounds are empty", () => {
    const key = keyBetween(null, null);
    assert.equal(key.length, 16);
  });

  it("creates increasing keys when appending toward the end", () => {
    const first = keyBetween(null, null);
    const second = keyBetween(first, null);
    const third = keyBetween(second, null);

    assert.ok(first < second);
    assert.ok(second < third);
  });

  it("creates a key strictly between two existing keys", () => {
    const lower = keyBetween(null, null);
    const upper = keyBetween(lower, null);
    const middle = keyBetween(lower, upper);

    assert.ok(lower < middle);
    assert.ok(middle < upper);
  });
});

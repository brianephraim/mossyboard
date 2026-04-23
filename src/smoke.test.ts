import assert from "node:assert/strict";
import { describe, it } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    assert.equal(1 + 1, 2);
  });
});

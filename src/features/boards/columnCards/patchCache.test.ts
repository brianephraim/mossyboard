import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { applyMutation } from "./patchCache";
import type { ColumnCardItem } from "./useColumnCards";

const card = (
  id: string,
  position: string,
  priority: ColumnCardItem["priority"] = "none",
): ColumnCardItem => ({
  id,
  columnId: "col-1",
  title: id,
  description: "",
  priority,
  position,
  version: 0,
  tags: [],
});

describe("applyMutation", () => {
  it("removes a card by id", () => {
    const before = [card("a", "a"), card("b", "b"), card("c", "c")];
    const after = applyMutation(before, { type: "remove", cardId: "b" });
    assert.deepEqual(
      after.map((c) => c.id),
      ["a", "c"],
    );
  });

  it("inserts a card preserving position-sorted order", () => {
    const before = [card("a", "a"), card("c", "c")];
    const after = applyMutation(before, { type: "insert", card: card("b", "b") });
    assert.deepEqual(
      after.map((c) => c.id),
      ["a", "b", "c"],
    );
  });

  it("updates priority + position of an existing card and re-sorts", () => {
    const before = [card("a", "a"), card("b", "b"), card("c", "c")];
    const after = applyMutation(before, {
      type: "update",
      cardId: "a",
      patch: { position: "d", priority: "high" },
    });
    assert.deepEqual(
      after.map((c) => c.id),
      ["b", "c", "a"],
    );
    assert.equal(after[2]?.priority, "high");
  });

  it("returns the input unchanged when target id is not present", () => {
    const before = [card("a", "a")];
    const after = applyMutation(before, { type: "remove", cardId: "z" });
    assert.equal(after, before);
  });
});

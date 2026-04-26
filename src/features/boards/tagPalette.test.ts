import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { TAG_PALETTE, getTagSwatch } from "./tagPalette";

describe("getTagSwatch", () => {
  it("returns one of the palette entries", () => {
    const swatch = getTagSwatch("bug");
    assert.ok(TAG_PALETTE.includes(swatch));
  });

  it("is deterministic — same input maps to same swatch", () => {
    assert.equal(getTagSwatch("bug"), getTagSwatch("bug"));
    assert.equal(getTagSwatch("frontend"), getTagSwatch("frontend"));
  });

  it("distributes — different inputs do not all collide on one entry", () => {
    const inputs = ["a", "b", "c", "d", "e", "f", "g", "h", "alpha", "beta", "gamma"];
    const seen = new Set(inputs.map(getTagSwatch));
    assert.ok(seen.size > 1, "expected multiple distinct swatches");
  });
});

import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { describeColumnSlice, sliceQueryInput } from "./keys";
import type { BoardDetailSearch } from "../types";

const baseSearch: BoardDetailSearch = {
  view: "board",
  groupBy: "column",
  priority: [],
  tags: [],
};

describe("describeColumnSlice", () => {
  it("returns one 'all' slice when grouped by column with no filter", () => {
    const slices = describeColumnSlice("col-1", baseSearch);
    assert.deepEqual(slices, [{ columnId: "col-1", mode: "all" }]);
  });

  it("returns one 'filtered' slice when grouped by column with priority filter", () => {
    const slices = describeColumnSlice("col-1", {
      ...baseSearch,
      priority: ["high", "medium"],
    });
    assert.deepEqual(slices, [
      { columnId: "col-1", mode: "filtered", priorities: ["high", "medium"] },
    ]);
  });

  it("returns one slice per priority when grouped by priority with no filter", () => {
    const slices = describeColumnSlice("col-1", {
      ...baseSearch,
      groupBy: "priority",
    });
    assert.deepEqual(slices, [
      { columnId: "col-1", mode: "priority", priority: "none" },
      { columnId: "col-1", mode: "priority", priority: "low" },
      { columnId: "col-1", mode: "priority", priority: "medium" },
      { columnId: "col-1", mode: "priority", priority: "high" },
    ]);
  });

  it("returns one slice per visible priority when grouped by priority with filter", () => {
    const slices = describeColumnSlice("col-1", {
      ...baseSearch,
      groupBy: "priority",
      priority: ["high", "medium"],
    });
    assert.deepEqual(slices, [
      { columnId: "col-1", mode: "priority", priority: "medium" },
      { columnId: "col-1", mode: "priority", priority: "high" },
    ]);
  });
});

describe("sliceQueryInput limit", () => {
  it("uses a 50-card page size for 'all' slices", () => {
    assert.equal(sliceQueryInput({ columnId: "col", mode: "all" }).limit, 50);
  });

  it("uses a 50-card page size for 'filtered' slices", () => {
    assert.equal(
      sliceQueryInput({ columnId: "col", mode: "filtered", priorities: ["high"] }).limit,
      50,
    );
  });

  it("uses a 50-card page size for 'priority' slices", () => {
    assert.equal(
      sliceQueryInput({ columnId: "col", mode: "priority", priority: "high" }).limit,
      50,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  boardGroupingPreferencesReducer,
  selectGroupedBoardReorderEnabled,
  setGroupedBoardReorderEnabled,
} from "./board-grouping-preferences-slice";

describe("boardGroupingPreferences slice", () => {
  it("starts with grouped reorder disabled", () => {
    const state = boardGroupingPreferencesReducer(undefined, { type: "@@INIT" });
    assert.equal(state.groupedBoardReorderEnabled, false);
    assert.equal(selectGroupedBoardReorderEnabled({ boardGroupingPreferences: state }), false);
  });

  it("sets grouped reorder explicitly", () => {
    const state = boardGroupingPreferencesReducer(undefined, setGroupedBoardReorderEnabled(true));
    assert.equal(state.groupedBoardReorderEnabled, true);
    assert.equal(selectGroupedBoardReorderEnabled({ boardGroupingPreferences: state }), true);
  });
});

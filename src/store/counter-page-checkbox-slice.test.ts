import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  counterPageCheckboxReducer,
  selectCounterPageCheckboxChecked,
  setChecked,
  toggleChecked,
} from "./counter-page-checkbox-slice";

describe("counterPageCheckbox slice", () => {
  it("starts unchecked", () => {
    const state = counterPageCheckboxReducer(undefined, { type: "@@INIT" });
    assert.equal(state.checked, false);
    assert.equal(selectCounterPageCheckboxChecked({ counterPageCheckbox: state }), false);
  });

  it("toggleChecked flips the value", () => {
    let state = counterPageCheckboxReducer(undefined, toggleChecked());
    assert.equal(state.checked, true);
    state = counterPageCheckboxReducer(state, toggleChecked());
    assert.equal(state.checked, false);
  });

  it("setChecked sets explicit value", () => {
    const state = counterPageCheckboxReducer(undefined, setChecked(true));
    assert.equal(state.checked, true);
    assert.equal(selectCounterPageCheckboxChecked({ counterPageCheckbox: state }), true);
  });
});

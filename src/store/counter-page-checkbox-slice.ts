import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Redux (not component state) so the value survives `/` unmount when navigating away and back. */
export type CounterPageCheckboxState = {
  checked: boolean;
};

const initialState: CounterPageCheckboxState = {
  checked: false,
};

const counterPageCheckboxSlice = createSlice({
  name: "counterPageCheckbox",
  initialState,
  reducers: {
    toggleChecked(state) {
      state.checked = !state.checked;
    },
    setChecked(state, action: PayloadAction<boolean>) {
      state.checked = action.payload;
    },
  },
});

export const { toggleChecked, setChecked } = counterPageCheckboxSlice.actions;

export const counterPageCheckboxReducer = counterPageCheckboxSlice.reducer;

export function selectCounterPageCheckboxChecked(state: {
  counterPageCheckbox: CounterPageCheckboxState;
}): boolean {
  return state.counterPageCheckbox.checked;
}

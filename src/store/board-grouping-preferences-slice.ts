import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type BoardGroupingPreferencesState = {
  groupedBoardReorderEnabled: boolean;
};

const initialState: BoardGroupingPreferencesState = {
  groupedBoardReorderEnabled: false,
};

const boardGroupingPreferencesSlice = createSlice({
  name: "boardGroupingPreferences",
  initialState,
  reducers: {
    setGroupedBoardReorderEnabled(state, action: PayloadAction<boolean>) {
      state.groupedBoardReorderEnabled = action.payload;
    },
  },
});

export const { setGroupedBoardReorderEnabled } = boardGroupingPreferencesSlice.actions;

export const boardGroupingPreferencesReducer = boardGroupingPreferencesSlice.reducer;

export function selectGroupedBoardReorderEnabled(state: {
  boardGroupingPreferences: BoardGroupingPreferencesState;
}): boolean {
  return state.boardGroupingPreferences.groupedBoardReorderEnabled;
}

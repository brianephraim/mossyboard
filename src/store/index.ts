import { configureStore } from "@reduxjs/toolkit";

import { boardGroupingPreferencesReducer } from "./board-grouping-preferences-slice";
import { counterPageCheckboxReducer } from "./counter-page-checkbox-slice";

export function makeStore() {
  return configureStore({
    reducer: {
      boardGroupingPreferences: boardGroupingPreferencesReducer,
      counterPageCheckbox: counterPageCheckboxReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

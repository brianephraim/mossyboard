import { configureStore } from "@reduxjs/toolkit";

import { counterPageCheckboxReducer } from "./counter-page-checkbox-slice";

export function makeStore() {
  return configureStore({
    reducer: {
      counterPageCheckbox: counterPageCheckboxReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

import type { ReactNode } from "react";
import { useRef } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "./index";

export function StoreProvider({ children }: Readonly<{ children: ReactNode }>) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}

import type { ReactNode } from "react";

import { TamaguiProvider } from "@tamagui/core";

import config from "../tamagui.config";

export function TamaguiRootProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      {children}
    </TamaguiProvider>
  );
}

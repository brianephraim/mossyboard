import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Text } from "@tamagui/core";

import { AuthAnnounceContext } from "./AuthAnnounceContext";

export function AuthAnnounceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [message, setMessage] = useState<string | null>(null);

  const announce = useCallback((next: string | null) => {
    setMessage(next);
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <AuthAnnounceContext.Provider value={value}>
      {children}
      <Text
        aria-live="polite"
        aria-relevant="additions text"
        position="absolute"
        width={1}
        height={1}
        padding={0}
        margin={-1}
        overflow="hidden"
        opacity={0}
        pointerEvents="none"
      >
        {message ?? ""}
      </Text>
    </AuthAnnounceContext.Provider>
  );
}

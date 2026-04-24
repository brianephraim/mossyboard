import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Stack } from "@tamagui/core";

type AuthAnnounceContextValue = {
  announce: (message: string | null) => void;
};

const AuthAnnounceContext = createContext<AuthAnnounceContextValue | null>(null);

export function AuthAnnounceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [message, setMessage] = useState<string | null>(null);

  const announce = useCallback((next: string | null) => {
    setMessage(next);
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <AuthAnnounceContext.Provider value={value}>
      {children}
      <Stack
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
      </Stack>
    </AuthAnnounceContext.Provider>
  );
}

export function useAuthAnnounce() {
  const ctx = useContext(AuthAnnounceContext);
  if (!ctx) {
    throw new Error("useAuthAnnounce must be used within AuthAnnounceProvider");
  }

  return ctx;
}

/** Optional consumer when the provider is not mounted (tests). */
export function useAuthAnnounceOptional() {
  return useContext(AuthAnnounceContext);
}

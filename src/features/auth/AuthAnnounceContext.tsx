import { createContext, useContext } from "react";

type AuthAnnounceContextValue = {
  announce: (message: string | null) => void;
};

export const AuthAnnounceContext = createContext<AuthAnnounceContextValue | null>(null);

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

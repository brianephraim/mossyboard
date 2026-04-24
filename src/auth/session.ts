import { useSyncExternalStore } from "react";

import { getAuthSessionSnapshot, refreshUserSession, subscribeToAuthSession } from "./client";
import { firebaseClientEnv } from "./config";

export function useAuthSession() {
  return useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSessionSnapshot,
    getAuthSessionSnapshot,
  );
}

export function useRequiresEmailVerification() {
  return firebaseClientEnv.VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION;
}

export async function refreshAuthSession() {
  return refreshUserSession();
}

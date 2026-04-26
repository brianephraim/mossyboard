import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onIdTokenChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import { firebaseClientEnv } from "./config";
import { setAuthToken } from "./token-store";

const app = initializeApp({
  apiKey: firebaseClientEnv.VITE_PUBLIC_FIREBASE_API_KEY,
  authDomain: firebaseClientEnv.VITE_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseClientEnv.VITE_PUBLIC_FIREBASE_PROJECT_ID,
  appId: firebaseClientEnv.VITE_PUBLIC_FIREBASE_APP_ID,
});

export const auth = getAuth(app);

if (import.meta.env.MODE !== "production") {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
}

let started = false;
let initialAuthResolved = false;
const listeners = new Set<() => void>();
let currentSnapshot = {
  hasResolvedInitialAuth: initialAuthResolved,
  isSignedIn: Boolean(auth.currentUser),
  user: auth.currentUser,
};

function notifyAuthListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function updateAuthSnapshot(user: User | null) {
  currentSnapshot = {
    hasResolvedInitialAuth: initialAuthResolved,
    isSignedIn: Boolean(user),
    user,
  };
}

export function startAuthSession() {
  if (started || typeof window === "undefined") return;
  started = true;

  void setPersistence(auth, browserLocalPersistence);

  onIdTokenChanged(auth, async (user) => {
    try {
      if (user) {
        const token = await user.getIdToken();
        setAuthToken(token);
      } else {
        setAuthToken(null);
      }
    } catch {
      setAuthToken(null);
    }

    initialAuthResolved = true;
    updateAuthSnapshot(user);
    notifyAuthListeners();
  });
}

export async function signUpWithEmail(input: { email: string; password: string }) {
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
  return credential.user;
}

export async function signInWithEmail(input: { email: string; password: string }) {
  const credential = await signInWithEmailAndPassword(auth, input.email, input.password);
  return credential.user;
}

export async function signOutUser() {
  await signOut(auth);
}

export function getUser(): User | null {
  return auth.currentUser;
}

export async function refreshUserSession() {
  if (!auth.currentUser) {
    updateAuthSnapshot(null);
    return null;
  }

  await auth.currentUser.reload();
  const refreshedUser = auth.currentUser;

  if (!refreshedUser) {
    setAuthToken(null);
  } else {
    const token = await refreshedUser.getIdToken(true);
    setAuthToken(token);
  }

  updateAuthSnapshot(refreshedUser);
  notifyAuthListeners();
  return refreshedUser;
}

export function subscribeToAuthSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthSessionSnapshot() {
  return currentSnapshot;
}

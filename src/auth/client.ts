import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
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

let started = false;
export function startAuthSession() {
  if (started) return;
  started = true;

  void setPersistence(auth, browserLocalPersistence);

  onIdTokenChanged(auth, async (user) => {
    if (!user) {
      setAuthToken(null);
      return;
    }
    const token = await user.getIdToken();
    setAuthToken(token);
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

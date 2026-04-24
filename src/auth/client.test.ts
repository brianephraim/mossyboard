import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

const mockCreateUser = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockSetPersistence = vi.fn();
const mockOnIdTokenChanged = vi.fn();
const mockAuth = {
  currentUser: null as null | {
    uid: string;
    getIdToken: (forceRefresh?: boolean) => Promise<string>;
    reload: () => Promise<void>;
  },
};

vi.mock("firebase/auth", () => ({
  browserLocalPersistence: {},
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUser(...args),
  getAuth: () => mockAuth,
  onIdTokenChanged: (...args: any[]) => mockOnIdTokenChanged(...args),
  setPersistence: (...args: any[]) => mockSetPersistence(...args),
  signInWithEmailAndPassword: (...args: any[]) => mockSignIn(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
}));

describe("auth client module", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateUser.mockReset();
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockSetPersistence.mockReset();
    mockOnIdTokenChanged.mockReset();
    mockAuth.currentUser = null;
  });

  it("signUpWithEmail delegates to firebase", async () => {
    const user = { uid: "u1" };
    mockCreateUser.mockResolvedValueOnce({ user });
    const { signUpWithEmail } = await import("./client");

    const result = await signUpWithEmail({ email: "a@b.com", password: "pw" });
    assert.equal(result, user);
  });

  it("signInWithEmail delegates to firebase", async () => {
    const user = { uid: "u2" };
    mockSignIn.mockResolvedValueOnce({ user });
    const { signInWithEmail } = await import("./client");

    const result = await signInWithEmail({ email: "a@b.com", password: "pw" });
    assert.equal(result, user);
  });

  it("signOutUser delegates to firebase", async () => {
    mockSignOut.mockResolvedValueOnce(undefined);
    const { signOutUser } = await import("./client");
    await signOutUser();
    assert.equal(mockSignOut.mock.calls.length, 1);
  });

  it("returns a stable auth snapshot between notifications", async () => {
    const { getAuthSessionSnapshot, startAuthSession } = await import("./client");

    startAuthSession();
    const initialSnapshot = getAuthSessionSnapshot();
    assert.equal(initialSnapshot, getAuthSessionSnapshot());
    assert.equal(initialSnapshot.isSignedIn, false);

    const callback = mockOnIdTokenChanged.mock.calls.at(-1)?.[1];
    assert.equal(typeof callback, "function");

    const nextUser = {
      uid: "u3",
      getIdToken: vi.fn(async () => "token-1"),
      reload: vi.fn(async () => undefined),
    };
    mockAuth.currentUser = nextUser;

    await callback(nextUser);

    const nextSnapshot = getAuthSessionSnapshot();
    assert.equal(nextSnapshot, getAuthSessionSnapshot());
    assert.equal(nextSnapshot.isSignedIn, true);
    assert.equal(nextSnapshot.user, nextUser);
  });
});

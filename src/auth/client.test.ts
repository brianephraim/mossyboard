import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

const mockCreateUser = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockSetPersistence = vi.fn();
const mockOnIdTokenChanged = vi.fn();

vi.mock("firebase/auth", () => ({
  browserLocalPersistence: {},
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUser(...args),
  getAuth: () => ({ currentUser: null }),
  onIdTokenChanged: (...args: any[]) => mockOnIdTokenChanged(...args),
  setPersistence: (...args: any[]) => mockSetPersistence(...args),
  signInWithEmailAndPassword: (...args: any[]) => mockSignIn(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
}));

describe("auth client module", () => {
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
});

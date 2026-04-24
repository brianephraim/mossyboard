import { FirebaseError } from "firebase/app";

export function mapSignInError(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (
      err.code === "auth/invalid-credential" ||
      err.code === "auth/wrong-password" ||
      err.code === "auth/user-not-found" ||
      err.code === "auth/invalid-email"
    ) {
      return "Email or password is incorrect.";
    }

    if (err.code === "auth/too-many-requests") {
      return "Too many attempts. Wait a minute and try again.";
    }

    if (err.code === "auth/network-request-failed") {
      return "We couldn't reach the server. Check your connection and try again.";
    }
  }

  return "We couldn't sign you in. Try again.";
}

export function mapSignUpError(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (err.code === "auth/email-already-in-use") {
      return "An account already exists for this email. Sign in instead.";
    }

    if (err.code === "auth/weak-password") {
      return "Password must be at least 6 characters.";
    }

    if (err.code === "auth/too-many-requests") {
      return "Too many attempts. Wait a minute and try again.";
    }

    if (err.code === "auth/network-request-failed") {
      return "We couldn't reach the server. Check your connection and try again.";
    }
  }

  return "We couldn't create your account. Try again.";
}

export function mapPasswordResetSendError(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (err.code === "auth/too-many-requests") {
      return "Too many requests. Wait a minute and try again.";
    }

    if (err.code === "auth/network-request-failed") {
      return "We couldn't reach the server. Check your connection and try again.";
    }
  }

  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = String((err as { message?: string }).message ?? "");
    if (msg.toLowerCase().includes("too many")) {
      return "Too many requests. Wait a minute and try again.";
    }
  }

  return "We couldn't send the reset email. Try again.";
}

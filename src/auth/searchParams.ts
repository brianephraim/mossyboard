export type AuthMode = "signin" | "signup" | "reset";

const AUTH_MODES: ReadonlySet<string> = new Set(["signin", "signup", "reset"]);

export function parseAuthMode(value: unknown): AuthMode {
  if (typeof value === "string" && AUTH_MODES.has(value)) {
    return value as AuthMode;
  }

  return "signin";
}

const MAX_REDIRECT_LEN = 1024;

/**
 * Same-origin app paths only; invalid or unsafe values fall back to `/boards`.
 */
export function parseSafeRedirectTo(primary: unknown, legacyRedirect: unknown): string {
  const raw =
    typeof primary === "string" && primary.length > 0
      ? primary
      : typeof legacyRedirect === "string" && legacyRedirect.length > 0
        ? legacyRedirect
        : undefined;

  if (!raw || raw.length > MAX_REDIRECT_LEN) {
    return "/boards";
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) {
    return "/boards";
  }

  if (trimmed.startsWith("//")) {
    return "/boards";
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("/auth") || lower.startsWith("/verify-email")) {
    return "/boards";
  }

  return trimmed;
}

export function parseSessionExpiredReason(value: unknown): boolean {
  return value === "session-expired";
}

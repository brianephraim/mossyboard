import "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Sql } from "postgres";

// TanStack Router scroll restoration touches window.scrollTo, which jsdom doesn't implement.
// We stub it for tests that mount the router.
Object.defineProperty(window, "scrollTo", {
  value: () => {},
  writable: true,
});

afterEach(() => {
  cleanup();
});

afterAll(async () => {
  // `postgres()` keeps sockets open; close them so Vitest can exit cleanly.
  const sql = (globalThis as unknown as { __sql__?: Sql }).__sql__;
  await sql?.end({ timeout: 5 });
});

// Load `.env` for local test runs (gitignored).
// We only fill missing keys to avoid clobbering the runner's env.
try {
  const envPath = resolve(process.cwd(), ".env");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  // ignore missing .env in CI
}

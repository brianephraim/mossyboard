import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

export async function migrateTestDb() {
  process.env.DATABASE_URL = requireSsl(getTestDatabaseUrl());

  const result = spawnSync("npm", ["run", "db:migrate"], {
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(
      ["db:migrate failed for test DB", result.stdout?.trim(), result.stderr?.trim()]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

export function getTestDatabaseUrl() {
  const testUrl = process.env.DATABASE_URL_TEST;
  assert.ok(testUrl, "DATABASE_URL_TEST must be set");
  return testUrl;
}

export function requireSsl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return parsed.toString();
    }
    if (!parsed.searchParams.has("sslmode")) parsed.searchParams.set("sslmode", "require");
    return parsed.toString();
  } catch {
    return url;
  }
}

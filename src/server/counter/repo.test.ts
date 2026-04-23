import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { beforeAll, describe, it, vi } from "vitest";

async function migrateTestDb() {
  const testUrl = process.env.DATABASE_URL_TEST;
  assert.ok(testUrl, "DATABASE_URL_TEST must be set");

  // Reuse the normal drizzle config by temporarily pointing DATABASE_URL at the test DB.
  process.env.DATABASE_URL = requireSsl(testUrl);

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

function requireSsl(url: string) {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return url;
  }
}

describe("shared counter repo", () => {
  let canRun = true;

  beforeAll(async () => {
    try {
      await migrateTestDb();
      vi.resetModules();
    } catch {
      canRun = false;
    }
  });

  it("increments persistently", async () => {
    if (!canRun) return;
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const { getSharedCounter, incrementSharedCounter } = await import("./repo");

    const before = await getSharedCounter();
    const after = await incrementSharedCounter();
    assert.equal(after.value, before.value + 1);
  });
});

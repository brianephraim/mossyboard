import { spawnSync } from "node:child_process";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getDbHostname(databaseUrl) {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    throw new Error("DATABASE_URL must be a valid URL (e.g. postgres://...)");
  }
}

const databaseUrl = requireEnv("DATABASE_URL");
const hostname = getDbHostname(databaseUrl);
const isLocal = isLocalHost(hostname);

if (!isLocal) {
  const allowRemote = process.env.KANBAN_ALLOW_REMOTE_MIGRATE === "1";
  const confirmProd = process.env.CONFIRM_PROD_MIGRATE === "1";

  if (!allowRemote || !confirmProd) {
    console.error(
      `Refusing to migrate non-local database (host=${hostname}). This command is intended for local dev only.`,
    );
    console.error(
      "To override, set BOTH KANBAN_ALLOW_REMOTE_MIGRATE=1 and CONFIRM_PROD_MIGRATE=1 (two deliberate actions).",
    );
    process.exit(1);
  }

  console.error(`About to migrate REMOTE database: host=${hostname}`);
}

const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);

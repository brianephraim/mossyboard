import postgres from "postgres";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function assertLocalDatabase(url) {
  const hostname = new URL(url).hostname;
  if (!isLocalHost(hostname)) {
    throw new Error(
      `Refusing to reset non-local database (host=${hostname}). This script is for local dev only.`,
    );
  }
}

const databaseUrl = requireEnv("DATABASE_URL");
assertLocalDatabase(databaseUrl);

if (process.env.CONFIRM_DB_RESET !== "1") {
  console.error(
    "Refusing to reset without confirmation. Re-run with CONFIRM_DB_RESET=1 to drop and recreate the public schema.",
  );
  process.exit(1);
}

const sql = postgres(databaseUrl, { prepare: false, max: 1 });
try {
  await sql.unsafe("DROP SCHEMA public CASCADE;");
  await sql.unsafe("CREATE SCHEMA public;");
  console.log("Reset complete.");
} finally {
  await sql.end({ timeout: 2 });
}

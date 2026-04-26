import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";

import postgres from "postgres";

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function tryUrlHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function nowMs() {
  return Date.now();
}

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return { lines: [], map: new Map() };
  }
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const map = new Map();
  for (const line of lines) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!match) continue;
    map.set(match[1], match[2]);
  }
  return { lines, map };
}

function writeEnvFile(envPath, lines) {
  const content = lines.join("\n").replace(/\n*$/, "\n");
  fs.writeFileSync(envPath, content, "utf8");
}

function upsertEnvKey(envState, key, value) {
  if (envState.map.has(key)) return false;
  envState.lines.push(`${key}=${value}`);
  envState.map.set(key, value);
  return true;
}

function setEnvKey(envState, key, value) {
  let replaced = false;
  envState.lines = envState.lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!replaced) {
    envState.lines.push(`${key}=${value}`);
  }
  envState.map.set(key, value);
  return true;
}

function deleteEnvKey(envState, key) {
  const before = envState.lines.length;
  envState.lines = envState.lines.filter((line) => !line.startsWith(`${key}=`));
  envState.map.delete(key);
  return envState.lines.length !== before;
}

function cmdOk(command, args) {
  const result = spawnSync(command, args, { stdio: "ignore" });
  return result.status === 0;
}

async function promptYesNo(rl, message, defaultYes = true) {
  const suffix = defaultYes ? " [Y/n] " : " [y/N] ";
  const answer = (await rl.question(`${message}${suffix}`)).trim().toLowerCase();
  if (!answer) return defaultYes;
  if (["y", "yes"].includes(answer)) return true;
  if (["n", "no"].includes(answer)) return false;
  return defaultYes;
}

async function pickDbFlavor(rl, detected) {
  const order = ["supabase", "docker", "host"];
  const available = order.filter((f) => detected.has(f));
  if (available.length === 1) return available[0];

  const menu = [
    [
      "1",
      "supabase",
      "Supabase CLI",
      "Convenient local stack; `supabase start` usually runs via Docker.",
    ],
    ["2", "docker", "Docker", "Runs only Postgres via `docker compose` (no Supabase services)."],
    ["3", "host", "Host Postgres", "Uses a Postgres already running on your machine (no Docker)."],
  ];

  const detectedLabels =
    available.length > 0 ? available.join(", ") : "none (you can still pick one and install it)";

  const answer = (
    await rl.question(
      `Pick a local Postgres flavor (detected: ${detectedLabels}):\n` +
        menu.map(([k, _id, label, note]) => `  ${k}) ${label} — ${note}`).join("\n") +
        `\n> `,
    )
  ).trim();

  const byKey = new Map(menu.map(([k, id]) => [k, id]));
  return byKey.get(answer) ?? "docker";
}

function databaseUrlsForFlavor(flavor, port) {
  const base = `postgres://postgres:postgres@localhost:${port}`;
  return {
    DATABASE_URL: `${base}/kanban_dev`,
    DATABASE_URL_TEST: `${base}/kanban_test`,
  };
}

async function ensureRolesAndDatabases(port) {
  const admin = postgres(`postgres://postgres:postgres@localhost:${port}/postgres`, {
    prepare: false,
    max: 1,
  });

  try {
    await admin.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      END $$;
    `);

    const dbRows = await admin /* sql */ `
      select datname
      from pg_database
      where datname in ('kanban_dev', 'kanban_test')
    `;
    const existing = new Set(dbRows.map((r) => r.datname));
    if (!existing.has("kanban_dev")) {
      await admin.unsafe("CREATE DATABASE kanban_dev;");
    }
    if (!existing.has("kanban_test")) {
      await admin.unsafe("CREATE DATABASE kanban_test;");
    }
  } finally {
    await admin.end({ timeout: 2 });
  }
}

function ensureDockerPostgresRunning() {
  if (!cmdOk("docker", ["info"])) {
    throw new Error("Docker is not available. Install/start Docker Desktop first.");
  }
  // Bring up the dev compose file.
  const up = spawnSync("docker", ["compose", "-f", "docker-compose.dev.yml", "up", "-d"], {
    stdio: "inherit",
  });
  if (up.status !== 0) throw new Error("docker compose up failed");
}

async function checkPort(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

async function listEmulatorAccounts() {
  const res = await fetch(
    "http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/demo-kanban/accounts",
  );
  if (!res.ok) return [];
  const body = await res.json();
  return Array.isArray(body.users) ? body.users : [];
}

async function createEmulatorUser() {
  const res = await fetch(
    "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "dev@example.com",
        password: "password",
        returnSecureToken: true,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create emulator user: ${text}`);
  }
  const body = await res.json();
  if (!body.localId) throw new Error("Emulator user creation did not return localId");
  return body.localId;
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    reset: args.has("--reset"),
  };
}

const args = parseArgs(process.argv);
const repoRoot = process.cwd();
const envPath = path.join(repoRoot, ".env");
const start = nowMs();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

try {
  // Step 1: prod-creds bleed check.
  const envState = readEnvFile(envPath);
  const existingDbUrl = envState.map.get("DATABASE_URL");
  if (existingDbUrl) {
    const host = tryUrlHost(existingDbUrl);
    if (host && !isLocalHost(host)) {
      console.error(`Your .env DATABASE_URL looks remote (host=${host}).`);
      console.error("Move production credentials to Vercel env config and keep .env dev-only.");
      console.error("");
      console.error("Example (run in a shell where you are logged into Vercel):");
      console.error("  vercel env add DATABASE_URL production");
      console.error("  vercel env add FIREBASE_SERVICE_ACCOUNT_JSON production");
      console.error("  vercel env add RESEND_API_KEY production");
      console.error("  vercel env add RESEND_FROM_EMAIL production");
      process.exit(1);
    }
  }

  // Step 2: ensure .env exists.
  if (!fs.existsSync(envPath)) {
    writeEnvFile(envPath, ["# Local development env (dev-only)."]);
  }

  // Reload after possible creation.
  const env = readEnvFile(envPath);

  // Reset flow: forget flavor and derived DB URLs.
  if (args.reset) {
    deleteEnvKey(env, "KANBAN_LOCAL_DB_FLAVOR");
    deleteEnvKey(env, "DATABASE_URL");
    deleteEnvKey(env, "DATABASE_URL_TEST");
  }

  // Step 3: generic constants (never overwrite).
  upsertEnvKey(env, "FIREBASE_AUTH_EMULATOR_HOST", "localhost:9099");
  upsertEnvKey(env, "VITE_PUBLIC_FIREBASE_API_KEY", "fake-api-key");
  upsertEnvKey(env, "VITE_PUBLIC_FIREBASE_AUTH_DOMAIN", "demo-kanban.firebaseapp.com");
  upsertEnvKey(env, "VITE_PUBLIC_FIREBASE_PROJECT_ID", "demo-kanban");
  upsertEnvKey(env, "VITE_PUBLIC_FIREBASE_APP_ID", "demo-app-id");
  upsertEnvKey(env, "RESEND_API_KEY", "disabled-in-dev");
  upsertEnvKey(env, "RESEND_FROM_EMAIL", "dev@example.com");

  // Step 4: flavor selection + persistence.
  const detected = new Set();
  if (cmdOk("supabase", ["--version"])) detected.add("supabase");
  if (cmdOk("docker", ["info"])) detected.add("docker");
  if (cmdOk("pg_isready", ["-h", "localhost"])) detected.add("host");

  let flavor = env.map.get("KANBAN_LOCAL_DB_FLAVOR");
  if (!flavor) {
    flavor = await pickDbFlavor(rl, detected);
    setEnvKey(env, "KANBAN_LOCAL_DB_FLAVOR", flavor);
  }

  // Step 5: tool installed check.
  if (flavor === "supabase" && !cmdOk("supabase", ["--version"])) {
    console.error("Supabase CLI not found. Install: brew install supabase/tap/supabase");
    process.exit(1);
  }
  if (flavor === "docker" && !cmdOk("docker", ["info"])) {
    console.error("Docker not available. Install/start Docker Desktop.");
    process.exit(1);
  }
  if (flavor === "host" && !cmdOk("pg_isready", ["-h", "localhost"])) {
    console.error(
      "Host Postgres not detected. Install Postgres (e.g. brew install postgresql@16).",
    );
    process.exit(1);
  }
  if (flavor === "supabase" && !cmdOk("docker", ["info"])) {
    console.error(
      "Supabase CLI mode typically requires Docker to run `supabase start`. Start Docker Desktop or pick option 3 (Host Postgres).",
    );
    process.exit(1);
  }

  // Step 6-9: ensure DB service, roles, dbs, and write DATABASE_URLs.
  const port = 5432;
  const urls = databaseUrlsForFlavor(flavor, port);

  if (flavor === "docker") {
    if (!cmdOk("pg_isready", ["-h", "localhost", "-p", String(port)])) {
      const ok = await promptYesNo(rl, "Start Docker Postgres via docker-compose.dev.yml?", true);
      if (!ok) process.exit(1);
      ensureDockerPostgresRunning();

      // Wait briefly for readiness.
      for (let i = 0; i < 20; i++) {
        if (cmdOk("pg_isready", ["-h", "localhost", "-p", String(port)])) break;
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    await ensureRolesAndDatabases(port);
  }

  if (flavor === "host") {
    if (!cmdOk("pg_isready", ["-h", "localhost", "-p", String(port)])) {
      const ok = await promptYesNo(rl, "Start host Postgres service now?", true);
      if (!ok) process.exit(1);
      if (os.platform() === "darwin") {
        console.error("Run: brew services start postgresql@16");
      } else {
        console.error(
          "Start Postgres using your OS service manager (e.g. systemctl start postgresql).",
        );
      }
      process.exit(1);
    }

    await ensureRolesAndDatabases(port);
  }

  if (flavor === "supabase") {
    if (!cmdOk("pg_isready", ["-h", "localhost", "-p", String(port)])) {
      const ok = await promptYesNo(rl, "Start Supabase local stack (supabase start)?", true);
      if (!ok) process.exit(1);
      const startRes = spawnSync("supabase", ["start"], { stdio: "inherit" });
      if (startRes.status !== 0) process.exit(startRes.status ?? 1);
    }
    // Assume Supabase local Postgres is reachable on localhost:5432 with postgres/postgres.
    await ensureRolesAndDatabases(port);
  }

  if (!env.map.has("DATABASE_URL")) setEnvKey(env, "DATABASE_URL", urls.DATABASE_URL);
  if (!env.map.has("DATABASE_URL_TEST"))
    setEnvKey(env, "DATABASE_URL_TEST", urls.DATABASE_URL_TEST);

  // Persist env changes early, before migrations.
  writeEnvFile(envPath, env.lines);

  // Step 10: Firebase CLI installed.
  if (!cmdOk("firebase", ["--version"])) {
    console.error("Firebase CLI not found. Install: npm install -g firebase-tools");
    process.exit(1);
  }

  // Step 11: Java installed.
  if (!cmdOk("java", ["-version"])) {
    console.error(
      "Java runtime not found (required by Firebase Auth Emulator). Install a JRE/JDK.",
    );
    process.exit(1);
  }

  // Step 13: emulator running (start + own process).
  const emulatorUp = await checkPort("http://localhost:9099/");
  let emulatorProc = null;
  if (!emulatorUp) {
    const ok = await promptYesNo(rl, "Start Firebase Auth Emulator now?", true);
    if (!ok) process.exit(1);

    emulatorProc = spawn("firebase", ["emulators:start", "--only", "auth"], {
      stdio: "inherit",
    });

    const cleanup = () => {
      if (emulatorProc && !emulatorProc.killed) {
        emulatorProc.kill("SIGINT");
      }
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Wait for readiness.
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (await checkPort("http://localhost:9099/")) break;
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // Step 14: default user exists.
  const users = await listEmulatorAccounts();
  const existing = users.find((u) => u.email === "dev@example.com");
  let ownerId = env.map.get("KANBAN_DEV_OWNER_ID");
  if (!ownerId) {
    if (existing?.localId) {
      ownerId = existing.localId;
    } else {
      ownerId = await createEmulatorUser();
    }
    setEnvKey(env, "KANBAN_DEV_OWNER_ID", ownerId);
    writeEnvFile(envPath, env.lines);
  }

  // Step 15: run migrations against dev DB.
  const migrate = spawnSync("node", ["scripts/db-migrate.mjs"], {
    stdio: "inherit",
    env: { ...process.env, ...Object.fromEntries(env.map) },
  });
  if (migrate.status !== 0) process.exit(migrate.status ?? 1);

  // Step 16: seed if boards empty.
  const devSql = postgres(urls.DATABASE_URL, { prepare: false, max: 1 });
  const countRows = await devSql /* sql */ `
    select count(*)::int as count
    from boards
    where deleted_at is null
  `;
  const count = countRows[0]?.count ?? 0;
  await devSql.end({ timeout: 2 });
  if (Number.isFinite(count) && count === 0) {
    const okSeed = await promptYesNo(rl, "Seed a starter board?", true);
    if (!okSeed) process.exit(1);
    const seed = spawnSync("node", ["scripts/db-seed.mjs"], {
      stdio: "inherit",
      env: { ...process.env, ...Object.fromEntries(env.map) },
    });
    if (seed.status !== 0) process.exit(seed.status ?? 1);
  }

  const elapsed = nowMs() - start;
  if (elapsed < 300) {
    // keep output minimal on happy-path re-run
  } else {
    console.log(`Dev setup complete in ${elapsed}ms.`);
  }

  // Step 17: hand off to vite, keeping emulator process attached.
  const viteProc = spawn("npx", ["vite"], {
    stdio: "inherit",
    env: { ...process.env, ...Object.fromEntries(env.map) },
  });

  const exitCode = await new Promise((resolve) => {
    viteProc.on("exit", (code) => resolve(code ?? 1));
  });

  if (emulatorProc && !emulatorProc.killed) {
    emulatorProc.kill("SIGINT");
  }
  process.exit(exitCode);
} finally {
  rl.close();
}

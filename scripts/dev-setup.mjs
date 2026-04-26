import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
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

function cmdOkWithOutput(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").toString(),
    stderr: (result.stderr ?? "").toString(),
  };
}

async function tcpPortInUse(host, port, timeoutMs = 400) {
  return await new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (used) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(used);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

function pgIsReadyOk(pgIsReadyPath, host, port) {
  if (!pgIsReadyPath) return false;
  return cmdOk(pgIsReadyPath, ["-h", host, "-p", String(port)]);
}

function resolvePgIsReady() {
  // Prefer PATH.
  const which = spawnSync("bash", ["-lc", "command -v pg_isready"], { encoding: "utf8" });
  const fromPath = (which.stdout ?? "").toString().trim();
  if (which.status === 0 && fromPath) return fromPath;

  // Homebrew keg-only installs (common on macOS).
  const candidates = [
    "/opt/homebrew/opt/postgresql@16/bin/pg_isready",
    "/usr/local/opt/postgresql@16/bin/pg_isready",
    "/opt/homebrew/bin/pg_isready",
    "/usr/local/bin/pg_isready",
  ];
  for (const candidate of candidates) {
    if (cmdOk(candidate, ["--version"])) return candidate;
  }
  return null;
}

function getDockerStatus() {
  const installed = cmdOk("docker", ["--version"]);
  const running = installed && cmdOk("docker", ["info"]);
  return { installed, running };
}

function identifyDockerPostgresContainers() {
  if (!cmdOk("docker", ["info"])) return [];
  const result = spawnSync("docker", ["ps", "--format", "{{.Names}}\t{{.Ports}}\t{{.Image}}"], {
    encoding: "utf8",
  });
  if (result.status !== 0) return [];
  const out = [];
  for (const line of (result.stdout ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("\t");
    if (parts.length < 3) continue;
    const [name, ports, image] = parts;
    if (!/postgres/i.test(image)) continue;
    const matches = ports.matchAll(/(?:0\.0\.0\.0|127\.0\.0\.1|\[::\]):(\d+)->(\d+)\/tcp/g);
    for (const m of matches) {
      const containerPort = Number(m[2]);
      if (containerPort !== 5432) continue;
      out.push({ name, hostPort: Number(m[1]), image });
    }
  }
  return out;
}

function identifySupabaseDbUrl() {
  if (!cmdOk("supabase", ["--version"])) return null;
  const result = spawnSync("supabase", ["status", "--output", "json"], { encoding: "utf8" });
  if (result.status !== 0) return null;
  try {
    const parsed = JSON.parse((result.stdout ?? "").toString());
    if (typeof parsed.DB_URL === "string" && parsed.DB_URL.length > 0) {
      return parsed.DB_URL;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function discoverPostgresListeners() {
  const dockerPg = identifyDockerPostgresContainers();
  const supabaseDbUrl = identifySupabaseDbUrl();
  let supabasePort = null;
  if (supabaseDbUrl) {
    try {
      supabasePort = Number(new URL(supabaseDbUrl).port) || 5432;
    } catch {
      /* ignore */
    }
  }

  const candidatePorts = new Set([5432, 5433, 54322]);
  for (const c of dockerPg) candidatePorts.add(c.hostPort);
  if (supabasePort) candidatePorts.add(supabasePort);

  const listeners = [];
  for (const port of candidatePorts) {
    if (!(await tcpPortInUse("127.0.0.1", port))) continue;

    const docker = dockerPg.find((d) => d.hostPort === port);
    if (docker) {
      const isOurContainer = docker.name === "kanban_dev_pg";
      listeners.push({
        host: "127.0.0.1",
        port,
        source: "docker",
        label: isOurContainer
          ? `Docker container "${docker.name}" (this repo's dev DB)`
          : `Docker container "${docker.name}"`,
        priority: isOurContainer ? 0 : 1,
      });
      continue;
    }

    if (supabasePort === port) {
      listeners.push({
        host: "127.0.0.1",
        port,
        source: "supabase",
        label: "Supabase CLI",
        supabaseDbUrl,
        priority: 2,
      });
      continue;
    }

    listeners.push({
      host: "127.0.0.1",
      port,
      source: "host",
      label: "Host Postgres",
      priority: 3,
    });
  }

  listeners.sort((a, b) => a.priority - b.priority || a.port - b.port);
  return listeners;
}

async function promptYesNo(rl, message, defaultYes = true) {
  const suffix = defaultYes ? " [Y/n] " : " [y/N] ";
  const answer = (await rl.question(`${message}${suffix}`)).trim().toLowerCase();
  if (!answer) return defaultYes;
  if (["y", "yes"].includes(answer)) return true;
  if (["n", "no"].includes(answer)) return false;
  return defaultYes;
}

async function pickDbFlavor(rl, detected, dockerStatus) {
  const menu = [
    [
      "1",
      "supabase",
      "Supabase CLI",
      "Convenient local stack; usually requires Docker running for `supabase start`.",
    ],
    [
      "2",
      "docker",
      "Docker",
      "Runs only Postgres via `docker compose` (no Supabase services). Requires Docker running.",
    ],
    ["3", "host", "Host Postgres", "Uses a Postgres already running on your machine (no Docker)."],
    ["4", "custom", "Custom URL", "Advanced — provide your own DATABASE_URL/DATABASE_URL_TEST."],
  ];

  const order = ["supabase", "docker", "host"];
  const available = order.filter((f) => detected.has(f));
  const detectedLabels =
    available.length > 0 ? available.join(", ") : "none (you can still pick one and install it)";

  const answer = (
    await rl.question(
      `Pick a local Postgres flavor (detected: ${detectedLabels}; docker: ${
        dockerStatus.installed
          ? dockerStatus.running
            ? "running"
            : "installed (not running)"
          : "not installed"
      }).\n` +
        `Auth in dev uses the Firebase Auth Emulator; you can sign in with dev@example.com / password.\n` +
        menu.map(([k, , label, note]) => `  ${k}) ${label} — ${note}`).join("\n") +
        `\n> `,
    )
  ).trim();

  const byKey = new Map(menu.map(([k, id]) => [k, id]));
  return byKey.get(answer) ?? "docker";
}

function deriveTestUrlFromDev(devUrl) {
  try {
    const u = new URL(devUrl);
    const dbname = u.pathname.replace(/^\//, "") || "kanban_dev";
    u.pathname = `/${dbname}_test`;
    return u.toString();
  } catch {
    return null;
  }
}

function adminUrlFromUserUrl(devUrl) {
  try {
    const u = new URL(devUrl);
    u.pathname = "/postgres";
    return u.toString();
  } catch {
    return null;
  }
}

async function promptCustomDatabaseUrls(rl) {
  console.log("");
  console.log("Custom DATABASE_URL mode. URLs must target localhost (dev-only safeguard).");
  console.log(
    "Include credentials inline if needed (e.g. postgres://user:pass@localhost:5432/db).",
  );
  console.log("");

  while (true) {
    const devUrl = (await rl.question("DATABASE_URL: ")).trim();
    if (!devUrl) {
      console.log("DATABASE_URL is required.");
      continue;
    }

    let parsed;
    try {
      parsed = new URL(devUrl);
    } catch {
      console.log("Could not parse that as a URL. Try again.");
      continue;
    }
    if (!isLocalHost(parsed.hostname)) {
      console.log(`Refusing non-local host (${parsed.hostname}). Dev URLs must be localhost.`);
      continue;
    }

    const defaultTest = deriveTestUrlFromDev(devUrl);
    const testInput = (
      await rl.question(`DATABASE_URL_TEST [${defaultTest ?? "required"}]: `)
    ).trim();
    const testUrl = testInput || defaultTest;
    if (!testUrl) {
      console.log("DATABASE_URL_TEST is required.");
      continue;
    }

    let parsedTest;
    try {
      parsedTest = new URL(testUrl);
    } catch {
      console.log("Could not parse DATABASE_URL_TEST.");
      continue;
    }
    if (!isLocalHost(parsedTest.hostname)) {
      console.log(`Refusing non-local host (${parsedTest.hostname}). Test URLs must be localhost.`);
      continue;
    }

    return {
      devUrl,
      testUrl,
      adminUrl: adminUrlFromUserUrl(devUrl),
    };
  }
}

function databaseUrlsForFlavor(flavor, port) {
  const base =
    flavor === "host"
      ? `postgres://localhost:${port}`
      : `postgres://postgres:postgres@localhost:${port}`;
  return {
    DATABASE_URL: `${base}/kanban_dev`,
    DATABASE_URL_TEST: `${base}/kanban_test`,
  };
}

function getSupabaseDbUrls() {
  const result = spawnSync("supabase", ["status", "--output", "json"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      ["supabase status failed", result.stdout?.trim(), result.stderr?.trim()]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const raw = (result.stdout ?? "").toString();
  const parsed = JSON.parse(raw);
  const dbUrl = parsed?.DB_URL;
  if (typeof dbUrl !== "string" || dbUrl.length === 0) {
    throw new Error("supabase status did not include DB_URL");
  }

  const admin = new URL(dbUrl);
  admin.pathname = "/postgres";

  const dev = new URL(dbUrl);
  dev.pathname = "/kanban_dev";

  const test = new URL(dbUrl);
  test.pathname = "/kanban_test";

  return { adminUrl: admin.toString(), devUrl: dev.toString(), testUrl: test.toString() };
}

async function ensureRolesAndDatabases(adminUrl) {
  const admin = postgres(adminUrl, {
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

function isMissingPostgresRoleError(err) {
  const message = String(err ?? "");
  return message.includes('role "postgres" does not exist');
}

function ensureDockerPostgresRunning(hostPort) {
  if (!cmdOk("docker", ["info"])) {
    throw new Error("Docker is not available. Install/start Docker Desktop first.");
  }
  // Bring up the dev compose file.
  const up = spawnSync(
    "docker",
    ["compose", "-f", "docker-compose.dev.yml", "up", "-d", "--force-recreate"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        KANBAN_DOCKER_PG_PORT: String(hostPort),
      },
    },
  );
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
  // Auth-emulator admin route. Requires `Bearer owner` to bypass auth in the
  // emulator; production identitytoolkit semantics do not apply here.
  const res = await fetch(
    "http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/demo-kanban/accounts:query",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({}),
    },
  );
  if (!res.ok) return [];
  const body = await res.json();
  return Array.isArray(body.userInfo) ? body.userInfo : [];
}

async function lookupEmulatorUserByEmail(email) {
  const users = await listEmulatorAccounts();
  const match = users.find((u) => u.email === email);
  return match?.localId ?? null;
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

  if (res.ok) {
    const body = await res.json();
    if (!body.localId) throw new Error("Emulator user creation did not return localId");
    return body.localId;
  }

  // The user may already exist (e.g. created in a previous wizard run but with
  // KANBAN_DEV_OWNER_ID missing from .env). Treat EMAIL_EXISTS as recoverable
  // by looking up the existing user instead of failing.
  const text = await res.text();
  if (text.includes("EMAIL_EXISTS")) {
    const existingId = await lookupEmulatorUserByEmail("dev@example.com");
    if (existingId) return existingId;
  }
  throw new Error(`Failed to create emulator user: ${text}`);
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
  const dockerStatus = getDockerStatus();
  const pgIsReady = resolvePgIsReady();
  const detected = new Set();
  if (cmdOk("supabase", ["--version"])) detected.add("supabase");
  if (dockerStatus.installed) detected.add("docker");
  if (pgIsReady) detected.add("host");

  let flavor = env.map.get("KANBAN_LOCAL_DB_FLAVOR");

  // When state is fresh, offer to reuse any Postgres already running on this
  // machine (host install, our own Docker container, Supabase CLI, etc.) before
  // dropping into the flavor menu. This is the typical scenario after `--reset`
  // or a first-time setup with an unrelated Postgres already on disk.
  let chosenDockerHostPort = null;
  if (!flavor) {
    const listeners = await discoverPostgresListeners();
    if (listeners.length > 0) {
      console.log("");
      console.log("Detected Postgres processes already running:");
      listeners.forEach((l, i) => {
        console.log(`  ${i + 1}) localhost:${l.port} — ${l.label}`);
      });
      const freshIdx = listeners.length + 1;
      const customIdx = listeners.length + 2;
      console.log(`  ${freshIdx}) None of these — start a fresh local Postgres`);
      console.log(`  ${customIdx}) Provide my own DATABASE_URL (advanced)`);
      console.log("");

      while (true) {
        const answer = (await rl.question("Reuse one of these? > ")).trim();
        const idx = Number(answer) - 1;
        if (Number.isInteger(idx) && idx >= 0 && idx < listeners.length) {
          const chosen = listeners[idx];
          flavor = chosen.source;
          if (chosen.source === "docker") chosenDockerHostPort = chosen.port;
          break;
        }
        if (Number(answer) === freshIdx) {
          break;
        }
        if (Number(answer) === customIdx) {
          flavor = "custom";
          break;
        }
        console.log("Please enter a number from the list.");
      }
    }
  }

  while (true) {
    if (!flavor) {
      flavor = await pickDbFlavor(rl, detected, dockerStatus);
    }

    // If the chosen flavor requires Docker but Docker isn't running, don't hard-fail.
    const needsDockerRunning = flavor === "supabase" || flavor === "docker";
    if (needsDockerRunning && !dockerStatus.running) {
      console.error("");
      console.error("This option requires Docker to be running.");
      console.error(
        "Start Docker Desktop (or your Docker daemon), then re-run `npm run dev`, or pick option 3 (Host Postgres) to avoid Docker.",
      );
      console.error("");

      const repick = await promptYesNo(rl, "Re-pick a different option now?", true);
      if (!repick) process.exit(1);
      flavor = await pickDbFlavor(rl, detected, dockerStatus);
      continue;
    }

    setEnvKey(env, "KANBAN_LOCAL_DB_FLAVOR", flavor);
    break;
  }

  // Step 5: tool installed check.
  if (flavor === "supabase" && !cmdOk("supabase", ["--version"])) {
    console.error("Supabase CLI not found. Install: brew install supabase/tap/supabase");
    process.exit(1);
  }
  if (flavor === "docker" && !dockerStatus.installed) {
    console.error("Docker not available. Install Docker Desktop.");
    process.exit(1);
  }
  if (flavor === "host" && !pgIsReady) {
    console.error(
      "Host Postgres tools not found (pg_isready missing). Install Postgres (e.g. brew install postgresql@16).",
    );
    process.exit(1);
  }

  // Step 6-9: ensure DB service, roles, dbs, and write DATABASE_URLs.
  const port = 5432;

  // For Docker mode, detect whether localhost:5432 is already taken by ANY listener
  // (commonly the host's Postgres). Docker's userland proxy can still bind the same
  // port without erroring, but connections to localhost:5432 then route to the host
  // Postgres, producing confusing "role \"postgres\" does not exist" failures.
  // A TCP probe is more reliable than `pg_isready`, which may not be on PATH at all
  // (e.g. keg-only Homebrew installs).
  const hostPortBusy = flavor === "docker" ? await tcpPortInUse("127.0.0.1", port) : false;
  const dockerHostPort =
    flavor === "docker" ? (chosenDockerHostPort ?? (hostPortBusy ? 5433 : port)) : port;

  if (flavor === "docker" && chosenDockerHostPort !== null) {
    console.log(`Reusing Docker Postgres on localhost:${dockerHostPort}.`);
  } else if (flavor === "docker" && dockerHostPort !== port) {
    console.log(
      `Docker Postgres will use localhost:${dockerHostPort} (localhost:${port} is already in use, likely by host Postgres).`,
    );
  }

  let derivedUrls;
  let derivedAdminUrl;
  if (flavor === "custom") {
    // If we already have URLs persisted from a prior run, reuse them; otherwise prompt.
    if (env.map.has("DATABASE_URL") && env.map.has("DATABASE_URL_TEST")) {
      derivedUrls = {
        DATABASE_URL: env.map.get("DATABASE_URL"),
        DATABASE_URL_TEST: env.map.get("DATABASE_URL_TEST"),
      };
      derivedAdminUrl = adminUrlFromUserUrl(derivedUrls.DATABASE_URL);
    } else {
      const custom = await promptCustomDatabaseUrls(rl);
      derivedUrls = { DATABASE_URL: custom.devUrl, DATABASE_URL_TEST: custom.testUrl };
      derivedAdminUrl = custom.adminUrl;
    }
  } else {
    derivedUrls =
      flavor === "docker"
        ? databaseUrlsForFlavor("docker", dockerHostPort)
        : databaseUrlsForFlavor(flavor, port);
    derivedAdminUrl =
      flavor === "host"
        ? `postgres://localhost:${port}/postgres`
        : flavor === "docker"
          ? `postgres://postgres:postgres@localhost:${dockerHostPort}/postgres`
          : `postgres://postgres:postgres@localhost:${port}/postgres`;
  }

  if (flavor === "docker") {
    const dockerReady = async () => {
      if (pgIsReady && pgIsReadyOk(pgIsReady, "localhost", dockerHostPort)) return true;
      // Fall back to a TCP probe if pg_isready is unavailable on PATH.
      return await tcpPortInUse("127.0.0.1", dockerHostPort);
    };

    if (!(await dockerReady())) {
      const ok = await promptYesNo(rl, "Start Docker Postgres via docker-compose.dev.yml?", true);
      if (!ok) process.exit(1);
      ensureDockerPostgresRunning(dockerHostPort);

      // Wait briefly for readiness.
      for (let i = 0; i < 40; i++) {
        if (await dockerReady()) break;
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    try {
      await ensureRolesAndDatabases(derivedAdminUrl);
    } catch (err) {
      if (isMissingPostgresRoleError(err)) {
        console.error("");
        console.error(
          "Your Docker Postgres volume appears to have been initialized with a different superuser (not 'postgres').",
        );
        console.error(
          "To fix this, we can reset the Docker dev Postgres volume (this deletes local dev data for Docker mode).",
        );
        console.error("");

        const okReset = await promptYesNo(
          rl,
          "Reset the Docker dev Postgres volume and retry?",
          true,
        );
        if (!okReset) process.exit(1);

        const down = spawnSync(
          "docker",
          ["compose", "-f", "docker-compose.dev.yml", "down", "-v"],
          {
            stdio: "inherit",
          },
        );
        if (down.status !== 0) process.exit(down.status ?? 1);

        ensureDockerPostgresRunning(dockerHostPort);

        // Wait briefly for readiness.
        for (let i = 0; i < 40; i++) {
          if (
            (pgIsReady && pgIsReadyOk(pgIsReady, "localhost", dockerHostPort)) ||
            (await tcpPortInUse("127.0.0.1", dockerHostPort))
          ) {
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        await ensureRolesAndDatabases(derivedAdminUrl);
      } else {
        console.error(String(err));
        console.error(
          "Could not bootstrap roles/databases. If you are using host Postgres, pick option 3.",
        );
        process.exit(1);
      }
    }
  }

  if (flavor === "host") {
    if (!pgIsReady) {
      console.error(
        "Host Postgres tools not found (pg_isready missing). Install Postgres (e.g. brew install postgresql@16).",
      );
      process.exit(1);
    }

    const ready = cmdOk(pgIsReady, ["-h", "localhost", "-p", String(port)]);
    if (!ready) {
      const ok = await promptYesNo(rl, "Start host Postgres service now?", true);
      if (!ok) process.exit(1);

      if (os.platform() === "darwin" && cmdOk("brew", ["--version"])) {
        const service = cmdOkWithOutput("brew", ["services", "start", "postgresql@16"]);
        if (!service.ok) {
          console.error(service.stderr.trim() || service.stdout.trim());
          console.error(
            "If brew services is unavailable, run Postgres manually or use Docker mode.",
          );
          process.exit(1);
        }
      } else {
        console.error(
          "Start Postgres using your OS service manager (e.g. systemctl start postgresql), then re-run npm run dev.",
        );
        process.exit(1);
      }

      // Re-check after start attempt.
      if (!cmdOk(pgIsReady, ["-h", "localhost", "-p", String(port)])) {
        console.error("Postgres still not reachable on localhost:5432 after start attempt.");
        process.exit(1);
      }
    }

    try {
      await ensureRolesAndDatabases(derivedAdminUrl);
    } catch (err) {
      console.error(String(err));
      console.error(
        "Could not connect to your local Postgres as an admin user. If your local Postgres requires a password, set DATABASE_URL manually in .env to include credentials, then re-run npm run dev.",
      );
      process.exit(1);
    }
  }

  if (flavor === "supabase") {
    let supa;
    try {
      supa = getSupabaseDbUrls();
    } catch {
      const ok = await promptYesNo(rl, "Start Supabase local stack (supabase start)?", true);
      if (!ok) process.exit(1);
      const startRes = spawnSync("supabase", ["start"], { stdio: "inherit" });
      if (startRes.status !== 0) process.exit(startRes.status ?? 1);
      supa = getSupabaseDbUrls();
    }

    derivedUrls = { DATABASE_URL: supa.devUrl, DATABASE_URL_TEST: supa.testUrl };
    derivedAdminUrl = supa.adminUrl;

    try {
      await ensureRolesAndDatabases(derivedAdminUrl);
    } catch (err) {
      console.error(String(err));
      console.error("Could not bootstrap roles/databases for Supabase local Postgres.");
      process.exit(1);
    }
  }

  if (flavor === "custom") {
    if (!derivedAdminUrl) {
      console.warn(
        "Skipping role/database bootstrap: could not derive an admin URL from your DATABASE_URL.",
      );
      console.warn(
        "Make sure your DATABASE_URL points to an existing database; migrations will run against it as-is.",
      );
    } else {
      try {
        await ensureRolesAndDatabases(derivedAdminUrl);
      } catch (err) {
        console.warn("");
        console.warn(
          "Skipping role/database bootstrap (admin connection failed). Make sure your DATABASE_URL points to an existing database with the required roles ('anon', 'authenticated') already configured.",
        );
        console.warn(`  ${String(err)}`);
        console.warn("");
      }
    }
  }

  // Force-overwrite when Docker mode picks a non-default host port (so a stale
  // .env value from a prior run does not collide with host Postgres on the same
  // port) or when the user supplied custom URLs (we want their answers persisted
  // even if a stale value happened to be in .env).
  const forceWriteUrls = flavor === "custom" || (flavor === "docker" && dockerHostPort !== port);
  if (forceWriteUrls || !env.map.has("DATABASE_URL")) {
    setEnvKey(env, "DATABASE_URL", derivedUrls.DATABASE_URL);
  }
  if (forceWriteUrls || !env.map.has("DATABASE_URL_TEST")) {
    setEnvKey(env, "DATABASE_URL_TEST", derivedUrls.DATABASE_URL_TEST);
  }

  // Persist env changes early, before migrations.
  writeEnvFile(envPath, env.lines);

  // Step 10: Firebase CLI available. We ship `firebase-tools` as a project
  // devDependency, so the local node_modules/.bin/firebase is the canonical
  // path. Fall back to a global install if it happens to exist.
  const localFirebaseBin = path.join(repoRoot, "node_modules", ".bin", "firebase");
  const firebaseBin = fs.existsSync(localFirebaseBin)
    ? localFirebaseBin
    : cmdOk("firebase", ["--version"])
      ? "firebase"
      : null;
  if (!firebaseBin) {
    console.error(
      "firebase-tools not found. Run `npm install` to pull in the project devDependency.",
    );
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

    // Detach the emulator's stdin so it does not race the wizard's readline
    // (and later Vite) for keystrokes.
    emulatorProc = spawn(firebaseBin, ["emulators:start", "--only", "auth"], {
      stdio: ["ignore", "inherit", "inherit"],
    });

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
  const devSql = postgres(derivedUrls.DATABASE_URL, { prepare: false, max: 1 });
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
    console.log("");
    console.log("Seeded starter data for the default emulator user.");
    console.log("Sign in with: dev@example.com / password");
    console.log(
      "If you sign in with a different email, set KANBAN_DEV_OWNER_ID to that user's UID in .env and re-run: npm run db:seed",
    );
  }

  const elapsed = nowMs() - start;
  if (elapsed < 300) {
    // keep output minimal on happy-path re-run
  } else {
    console.log(`Dev setup complete in ${elapsed}ms.`);
  }

  // Close readline before handing off to Vite. Otherwise the wizard's readline
  // and Vite both read from the same stdin and race for keypresses (including
  // Ctrl+C), which is the root cause of needing to mash Ctrl+C several times.
  rl.close();

  // Step 17: hand off to vite, keeping emulator process attached.
  const viteProc = spawn("npx", ["vite"], {
    stdio: "inherit",
    env: { ...process.env, ...Object.fromEntries(env.map) },
  });

  let shuttingDown = false;
  const killChild = (child, signal) => {
    if (!child) return;
    if (child.exitCode !== null) return;
    try {
      child.kill(signal);
    } catch {
      /* ignore */
    }
  };

  const shutdown = (signal) => {
    if (shuttingDown) {
      // Second Ctrl+C: escalate immediately.
      killChild(viteProc, "SIGKILL");
      killChild(emulatorProc, "SIGKILL");
      process.exit(130);
      return;
    }
    shuttingDown = true;
    console.log("\nShutting down (press Ctrl+C again to force)...");
    killChild(viteProc, signal);
    killChild(emulatorProc, signal);
    // Hard cap so a misbehaving child cannot hang the wizard.
    setTimeout(() => {
      killChild(viteProc, "SIGKILL");
      killChild(emulatorProc, "SIGKILL");
      process.exit(130);
    }, 5000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const exitCode = await new Promise((resolve) => {
    viteProc.once("exit", (code) => resolve(code ?? 0));
  });

  // Vite exited (likely because user hit Ctrl+C); make sure the emulator
  // follows it down within a short grace period before we exit ourselves.
  if (emulatorProc && emulatorProc.exitCode === null) {
    killChild(emulatorProc, "SIGINT");
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        killChild(emulatorProc, "SIGKILL");
        resolve();
      }, 3000);
      emulatorProc.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  process.exit(exitCode);
} finally {
  // No-op if already closed before the Vite handoff.
  rl.close();
}

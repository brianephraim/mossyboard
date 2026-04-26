import { spawnSync } from "node:child_process";

function run(command, args, extraEnv) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.VERCEL_ENV === "production") {
  run("node", ["scripts/db-migrate.mjs"], {
    KANBAN_ALLOW_REMOTE_MIGRATE: "1",
    CONFIRM_PROD_MIGRATE: "1",
  });
}

run("npx", ["vite", "build"]);

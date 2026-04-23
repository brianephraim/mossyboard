import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { serverEnv } from "../config";

declare global {
  // eslint-disable-next-line no-var
  var __db__: ReturnType<typeof drizzle> | undefined;
  // eslint-disable-next-line no-var
  var __sql__: postgres.Sql | undefined;
}

const sql = globalThis.__sql__ ?? postgres(serverEnv.DATABASE_URL, { max: 5 });
globalThis.__sql__ = sql;

export const db = globalThis.__db__ ?? drizzle(sql);
globalThis.__db__ = db;

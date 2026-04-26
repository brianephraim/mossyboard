import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { serverEnv } from "../config";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __db__: ReturnType<typeof drizzle<typeof schema>> | undefined;
  // eslint-disable-next-line no-var
  var __sql__: postgres.Sql | undefined;
}

// PgBouncer (including Supabase pooler on :6543) in transaction mode does not support
// prepared statements; postgres.js enables them by default.
const sql = globalThis.__sql__ ?? postgres(serverEnv.DATABASE_URL, { max: 5, prepare: false });
globalThis.__sql__ = sql;

export const db = globalThis.__db__ ?? drizzle(sql, { schema });
globalThis.__db__ = db;

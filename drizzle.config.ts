import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle/pg",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});

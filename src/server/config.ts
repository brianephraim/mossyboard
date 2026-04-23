import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

const parsed = serverEnvSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid server env: ${parsed.error.message}`);
}

export const serverEnv = parsed.data;

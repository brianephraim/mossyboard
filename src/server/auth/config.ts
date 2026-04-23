import { z } from "zod";

const serverFirebaseEnvSchema = z.object({
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1),
});

const parsed = serverFirebaseEnvSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid Firebase server env: ${parsed.error.message}`);
}

export const serverFirebaseEnv = parsed.data;

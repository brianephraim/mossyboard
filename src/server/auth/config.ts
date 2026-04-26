import { z } from "zod";

const baseSchema = z.object({
  FIREBASE_AUTH_EMULATOR_HOST: z.string().min(1).optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
  VITE_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
});

const parsed = baseSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid Firebase server env: ${parsed.error.message}`);
}

const env = parsed.data;

if (env.FIREBASE_AUTH_EMULATOR_HOST) {
  if (!env.VITE_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error(
      "Invalid Firebase server env: VITE_PUBLIC_FIREBASE_PROJECT_ID is required when FIREBASE_AUTH_EMULATOR_HOST is set",
    );
  }
} else {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Invalid Firebase server env: Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }
}

export const serverFirebaseEnv = env;

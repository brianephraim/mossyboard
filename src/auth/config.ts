import { z } from "zod";

const firebaseClientEnvSchema = z.object({
  VITE_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  VITE_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

const parsed = firebaseClientEnvSchema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error(`Invalid Firebase client env: ${parsed.error.message}`);
}

export const firebaseClientEnv = parsed.data;

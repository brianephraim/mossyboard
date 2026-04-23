import { z } from "zod";

const mailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  APP_BASE_URL: z.string().url().optional(),
});

export type MailEnv = z.infer<typeof mailEnvSchema>;

export function getMailEnv(): MailEnv {
  const parsed = mailEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid mail env: ${parsed.error.message}`);
  }
  return parsed.data;
}

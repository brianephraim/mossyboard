import type { ActionCodeSettings } from "firebase-admin/auth";

import { adminAuth } from "./admin";
import { getMailEnv } from "../mail/config";

function getActionCodeSettings(): ActionCodeSettings {
  const { APP_BASE_URL } = getMailEnv();
  const baseUrl = APP_BASE_URL ?? "http://localhost:5173";

  return {
    url: `${baseUrl}/auth`,
    handleCodeInApp: false,
  };
}

export async function createEmailVerificationLink(email: string): Promise<string> {
  return adminAuth.generateEmailVerificationLink(email, getActionCodeSettings());
}

export async function createPasswordResetLink(email: string): Promise<string> {
  return adminAuth.generatePasswordResetLink(email, getActionCodeSettings());
}

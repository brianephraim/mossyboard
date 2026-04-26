import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { serverFirebaseEnv } from "./config";

type ServiceAccount = {
  project_id: string;
  private_key: string;
  client_email: string;
};

function parseServiceAccount(json: string): ServiceAccount {
  const parsed = JSON.parse(json) as Partial<ServiceAccount>;
  if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON");
  }
  return parsed as ServiceAccount;
}

if (getApps().length === 0) {
  if (serverFirebaseEnv.FIREBASE_AUTH_EMULATOR_HOST) {
    initializeApp({
      projectId: serverFirebaseEnv.VITE_PUBLIC_FIREBASE_PROJECT_ID!,
    });
  } else {
    const sa = parseServiceAccount(serverFirebaseEnv.FIREBASE_SERVICE_ACCOUNT_JSON!);
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    });
  }
}

export const adminAuth = getAuth();

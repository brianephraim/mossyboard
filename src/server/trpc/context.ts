import { randomUUID } from "node:crypto";

import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export type TrpcContext = {
  authHeader: string | null;
  requestId: string;
  userId: string | null;
};

export function createTrpcContext({ req }: FetchCreateContextFnOptions): TrpcContext {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const authHeader = req.headers.get("authorization");
  return { requestId, authHeader, userId: null };
}

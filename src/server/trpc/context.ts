import { randomUUID } from "node:crypto";

import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export type TrpcContext = {
  requestId: string;
};

export function createTrpcContext({ req }: FetchCreateContextFnOptions): TrpcContext {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  return { requestId };
}

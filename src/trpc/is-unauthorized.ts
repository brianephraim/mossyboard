import { TRPCClientError } from "@trpc/client";

export function isTrpcUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) {
    return false;
  }

  const code = error.shape?.code;
  return code === "UNAUTHORIZED";
}

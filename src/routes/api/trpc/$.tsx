import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTrpcContext } from "../../../server/trpc/context";
import { appRouter } from "../../../server/trpc/router";

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        fetchRequestHandler({
          endpoint: "/api/trpc",
          req: request,
          router: appRouter,
          createContext: createTrpcContext,
        }),
      POST: async ({ request }) =>
        fetchRequestHandler({
          endpoint: "/api/trpc",
          req: request,
          router: appRouter,
          createContext: createTrpcContext,
        }),
    },
  },
});

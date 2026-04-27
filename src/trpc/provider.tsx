import type { ReactNode } from "react";
import { useState } from "react";
import { httpBatchLink } from "@trpc/client";
import type { QueryClient } from "@tanstack/react-query";
import { notifyManager } from "@tanstack/react-query";

import { trpc } from "./client";
import { getAuthToken } from "../auth/token-store";

// Make TanStack Query notify subscribers synchronously instead of deferring
// via setTimeout(0). With the default async scheduler, optimistic
// `queryClient.setQueryData(...)` patches don't reach React subscribers until
// the next macrotask — which is AFTER `@hello-pangea/dnd` starts its drop
// animation. The result is a one-frame flicker where the card snaps back to
// its original slot before the new order paints. React 18's auto-batching
// still coalesces state updates inside a single event tick, so we don't get
// extra re-render churn from this change.
notifyManager.setScheduler((cb) => cb());

export function TrpcProvider({
  children,
  queryClient,
}: Readonly<{ children: ReactNode; queryClient: QueryClient }>) {
  const [client] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          headers() {
            const token = getAuthToken();
            if (!token) return {};
            return { authorization: `Bearer ${token}` };
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      {children}
    </trpc.Provider>
  );
}

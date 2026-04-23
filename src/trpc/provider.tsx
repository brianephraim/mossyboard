import type { ReactNode } from "react";
import { useState } from "react";
import { httpBatchLink } from "@trpc/client";
import type { QueryClient } from "@tanstack/react-query";

import { trpc } from "./client";

export function TrpcProvider({
  children,
  queryClient,
}: Readonly<{ children: ReactNode; queryClient: QueryClient }>) {
  const [client] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
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

/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { TrpcProvider } from "../trpc/provider";
import { startAuthSession } from "../auth/client";
import { StoreProvider } from "../store/StoreProvider";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kanban" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Providers>
        <Outlet />
      </Providers>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  // TanStack Start requires the HTML document shell to be rendered by the root route.
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient());
  useState(() => {
    startAuthSession();
    return null;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TrpcProvider queryClient={queryClient}>{children}</TrpcProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { pinoHttp } from "pino-http";

import { logger } from "./src/server/logging/logger";

export default defineConfig({
  plugins: [
    {
      name: "kanban-pino-http-dev",
      configureServer(server) {
        server.middlewares.use(
          pinoHttp({
            logger,
            genReqId: (req, res) => {
              const existing = req.headers["x-request-id"];
              const id = Array.isArray(existing) ? existing[0] : existing;
              if (id) return id;

              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              return (res as any).reqId;
            },
            customLogLevel: (_req, res, err) => {
              if (err || res.statusCode >= 500) return "error";
              if (res.statusCode >= 400) return "warn";
              return "info";
            },
          }),
        );
      },
    },
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    // react's vite plugin must come after start's vite plugin
    react(),
  ],
  server: {
    port: 5173,
  },
});

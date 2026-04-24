import react from "@vitejs/plugin-react";
import { tamaguiPlugin } from "@tamagui/vite-plugin";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { pinoHttp } from "pino-http";
import { nitro } from "nitro/vite";

import { logger } from "./src/server/logging/logger";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@hello-pangea")) {
            return "vendor-dnd";
          }

          if (id.includes("react-dom")) {
            return "vendor-react-dom";
          }

          if (id.includes("react/") || id.endsWith("react/index.js")) {
            return "vendor-react";
          }

          if (id.includes("@trpc")) {
            return "vendor-trpc";
          }

          return;
        },
      },
    },
  },
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
    tamaguiPlugin({
      config: "./src/tamagui.config.ts",
      components: [
        "@tamagui/core",
        "@tamagui/stacks",
        "@tamagui/button",
        "@tamagui/checkbox",
        "@tamagui/linear-gradient",
      ],
      outputCSS: "./src/tamagui.css",
      optimize: process.env.NODE_ENV === "production",
    }),
    nitro({ preset: "vercel" }),
  ],
  server: {
    port: 5173,
  },
});

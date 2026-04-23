import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
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

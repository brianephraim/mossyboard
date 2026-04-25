import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    fileParallelism: false,
    // Node 24 + vitest/tinypool can intermittently crash during worker shutdown
    // with `ERR_IPC_CHANNEL_CLOSED`. vmThreads avoids child_process IPC.
    pool: "vmThreads",
    poolOptions: {
      vmThreads: {
        singleThread: true,
      },
    },
    setupFiles: ["./src/vitest.setup.ts"],
  },
});

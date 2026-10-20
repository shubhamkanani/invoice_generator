import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the "@/*" import alias from tsconfig.json
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      // Pin the zone to a negative UTC offset so date-only values that shift
      // by a day in the US are caught by the tests.
      TZ: "America/Los_Angeles",
      AUTH_SECRET: "test-secret-at-least-32-characters-long",
    },
    // The first run downloads an in-memory MongoDB binary.
    hookTimeout: 120000,
  },
});

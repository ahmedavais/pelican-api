import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["sensors/live/**/*.test.ts"], testTimeout: 60_000 },
});

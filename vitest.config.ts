import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test,spec}.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    setupFiles: ["./tests/utils/setup.ts"],
    coverage: {
      reporter: ["text", "json-summary"],
      include: ["features/**/*.ts", "lib/**/*.ts", "store/**/*.ts"],
      exclude: ["**/*.tsx", "**/data.ts", "**/mock-data.ts"],
    },
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@": rootDir,
      "server-only": resolve(rootDir, "node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
});

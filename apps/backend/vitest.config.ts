import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts", "src/**/*.test.ts"],
      thresholds: {
        branches: 65,
        functions: 65,
        lines: 65,
        statements: 65
      }
    }
  }
});

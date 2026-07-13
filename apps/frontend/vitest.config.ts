import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      thresholds: {
        branches: 65,
        functions: 65,
        lines: 65,
        statements: 65
      }
    }
  }
});

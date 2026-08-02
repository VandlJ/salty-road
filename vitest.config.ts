import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Resolves the "@/..." alias from tsconfig.json — without this every
  // import in a test file fails to resolve.
  plugins: [tsconfigPaths()],
  test: {
    // Default to node: most units under test are pure functions with no DOM.
    // Files that need a DOM opt in per-file via a docblock:
    //   /** @vitest-environment jsdom */
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      // Only the logic we actually assert on — pages/components are covered
      // by E2E instead, so leaving them in would produce a misleading number.
      include: ["src/lib/**", "src/app/api/**"],
    },
  },
});

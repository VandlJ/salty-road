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
      // Components were excluded when nothing here rendered one; they're in
      // scope now that there are component tests. Pages stay out — they're
      // covered by E2E, and including them would report a misleading number.
      include: ["src/lib/**", "src/app/api/**", "src/components/**"],
      exclude: ["src/test/**", "**/*.test.*"],
    },
  },
});

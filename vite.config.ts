import react from "@vitejs/plugin-react";
// vitest/config, not vite — it is the one that accepts the `test` block below.
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Physics and simulation tests are pure TypeScript and need no DOM.
    // A screen test opts into one with `// @vitest-environment jsdom` at the top of the file.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

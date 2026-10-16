import path from "node:path";
import { defineConfig } from "vitest/config";

// Mirrors the "@/*" path alias from tsconfig.json so tests can import app modules that use it.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
});

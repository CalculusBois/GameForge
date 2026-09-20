import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { parleyApiPlugin } from "./src/server/parleyPlugin";

export default defineConfig({
  plugins: [react(), parleyApiPlugin()],
  server: {
    port: 5175,
  },
  optimizeDeps: {
    include: ["phaser"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

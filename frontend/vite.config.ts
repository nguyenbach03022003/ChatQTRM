import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed dev port and quietens Vite's screen-clearing so Rust
// build logs stay visible. These settings are harmless for plain web builds.
const host = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  ?.env?.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: host || "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: host ? { protocol: "ws", host, port: 5183 } : undefined,
    watch: {
      // Don't let Vite watch the Rust source tree.
      ignored: ["**/src-tauri/**"],
    },
  },
});

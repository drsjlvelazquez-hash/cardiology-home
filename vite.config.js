import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// viteSingleFile inlines all JS/CSS into dist/index.html so the built app
// runs as one freestanding file (double-click, no server needed).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server: {
    port: 5173,
  },
});

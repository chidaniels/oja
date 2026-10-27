import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        // Library code changes rarely, so it lives in long-cached chunks apart from app code.
        // Form libraries get their own chunk so pages without forms never download them.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/](react-hook-form|zod|@hookform)[\\/]/.test(id)) return "forms";
          if (/[\\/](@tanstack|zustand)[\\/]/.test(id)) return "query";
          if (/[\\/](react|react-dom|react-router|scheduler|cookie|set-cookie-parser)[\\/]/.test(id)) return "react";
        },
      },
    },
  },
});

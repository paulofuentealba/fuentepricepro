import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tanstackStart(), react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Splits vendor libs that change independently of app code into their
        // own chunks, so a deploy that only touches app code doesn't force
        // browsers to re-download React/Firebase/Framer Motion again.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("firebase")) return "vendor-firebase";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
          return undefined;
        },
      },
    },
  },
});

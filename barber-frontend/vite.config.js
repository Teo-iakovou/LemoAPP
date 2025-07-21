import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase the warning limit for chunks (default is 500 kB)
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries into their own chunks
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  assetsInclude: ["**/*.JPG"], // Include JPG files as assets
});

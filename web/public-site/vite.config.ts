import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "EcoVision Pune",
        short_name: "EcoVision",
        description: "Every waste spot in Pune, in public. Report a spot in seconds.",
        theme_color: "#0B5C63",
        background_color: "#F7FAFA",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: { allowedHosts: true, proxy: { "/api": "http://localhost:8000", "/media": "http://localhost:8000" } },
});

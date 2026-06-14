import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api → server Fastify (batas integrasi client↔API).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 127.0.0.1 (bukan localhost) agar cocok dengan binding IPv4 server & hindari masalah ::1 di Windows.
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:4000';
const devHost = process.env.VITE_HOST || '0.0.0.0';
const devPort = Number(process.env.VITE_PORT) || 5173;
const previewPort = Number(process.env.VITE_PREVIEW_PORT) || 4173;
const publicHost = process.env.VITE_PUBLIC_HOST || undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: devHost,
    port: devPort,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
    hmr: publicHost
      ? {
          host: publicHost,
          clientPort: devPort,
          protocol: 'ws',
        }
      : undefined,
  },
  preview: {
    host: devHost,
    port: previewPort,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 5173,
    fs: {
      allow: ['../..'] // Allow access to root and sdk
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/maps': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:3000',
        ws: true,
        changeOrigin: true,
      }
    }
  }
});

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 5174, // Default V1 to 5174 if V2 takes 5173
    fs: {
      allow: ['../..']
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
        ws: true
      },
      // V1 specific: it might use root path for WS
      '^/socket.io': {
        target: 'ws://127.0.0.1:3000',
        ws: true
      }
    }
  }
});

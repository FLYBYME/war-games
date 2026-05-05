import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    fs: {
      allow: ['..']
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
      }
    }
  }
});

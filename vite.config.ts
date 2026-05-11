import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: 'src/client',
  resolve: {
    alias: {
      '@sdk': path.resolve(__dirname, './src/sdk_v2'),
      '@engine': path.resolve(__dirname, './src/engine'),
    },
  },
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

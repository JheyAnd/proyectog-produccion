import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'businessCaseApp',
      filename: 'remoteEntry.js',
      exposes: {
        './BusinessCasePage': './src/pages/BusinessCasePage.tsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom', 'recharts', 'lucide-react', '@tanstack/react-query']
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    port: 5131,
    strictPort: true,
    host: '0.0.0.0',
    cors: true,
  },
  server: {
    port: 5131,
    strictPort: true,
    host: '0.0.0.0',
    cors: true,
    proxy: {
      '^/api/v1/projects/.*/cash-flow': {
        target: 'http://127.0.0.1:8030',
        changeOrigin: true,
      },
      '^/api/v1/v2/projects/.*/cash-flow': {
        target: 'http://127.0.0.1:8030',
        changeOrigin: true,
      },
      '^/api/v1/business-case': {
        target: 'http://127.0.0.1:8031',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/business-case/, '/api/v1')
      },
      '/api': {
        target: 'http://127.0.0.1:8031',
        changeOrigin: true,
      }
    }
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  }
});

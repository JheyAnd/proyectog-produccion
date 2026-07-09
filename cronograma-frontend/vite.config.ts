import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'cronogramaApp',
      filename: 'remoteEntry.js',
      exposes: {
        './CronogramaPage': './src/pages/CronogramaPage.tsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom', 'recharts', '@tanstack/react-query']
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    port: 5132,
    strictPort: true,
    host: '0.0.0.0',
    cors: true,
  },
  server: {
    port: 5132,
    strictPort: true,
    host: '0.0.0.0',
    cors: true,
    proxy: {
      '/api/v1/cronograma': {
        target: 'http://127.0.0.1:8032',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8029', // El backend principal sigue en 8029
        changeOrigin: true,
      }
    },
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  }
});

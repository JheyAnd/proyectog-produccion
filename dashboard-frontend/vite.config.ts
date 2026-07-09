import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      federation({
        name: 'dashboardApp',
        filename: 'remoteEntry.js',
        exposes: {
          './DashboardPage': './src/pages/DashboardPage.tsx',
          './ProjectsPage': './src/pages/ProjectsPage.tsx',
          './GlobalSummaryPage': './src/pages/GlobalSummaryPage.tsx',
          './GlobalDashboardHubPage': './src/pages/GlobalDashboardHubPage.tsx',
          './GlobalPortfolioDashboardPage': './src/pages/GlobalPortfolioDashboardPage.tsx',
          './ReportsPage': './src/pages/ReportsPage.tsx',
          './AlertsPage': './src/pages/AlertsPage.tsx',
          './DocumentsPage': './src/pages/DocumentsPage.tsx',
          './ProjectTrackingPage': './src/pages/ProjectTrackingPage.tsx'
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
      port: 5133,
      strictPort: true,
      host: '0.0.0.0',
      cors: true,
    },
    server: {
      port: 5133,
      strictPort: true,
      host: '0.0.0.0',
      cors: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8029',
          changeOrigin: true,
        }
      },
    },
    build: {
      target: 'esnext',
      minify: false,
      cssCodeSplit: false
    }
  };
});

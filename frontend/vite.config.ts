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
        name: 'hostApp',
        remotes: {
          dashboardApp: env.VITE_DASHBOARD_REMOTE_URL || 'http://localhost:5133/assets/remoteEntry.js',
          cashFlowApp: env.VITE_CASH_FLOW_REMOTE_URL || 'http://localhost:5130/assets/remoteEntry.js',
          businessCaseApp: env.VITE_BUSINESS_CASE_REMOTE_URL || 'http://localhost:5131/assets/remoteEntry.js',
          cronogramaApp: env.VITE_CRONOGRAMA_REMOTE_URL || 'http://localhost:5132/assets/remoteEntry.js',
        },
        shared: ['react', 'react-dom', 'react-router-dom', 'recharts', 'lucide-react', '@tanstack/react-query']
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5129,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.ngrok-free.app'],
      proxy: {
        '^/api/v1/(cash-flow|business-case|cronograma)/projects/[^/]+$': {
          target: 'http://127.0.0.1:8029',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1\/(cash-flow|business-case|cronograma)/, '/api/v1')
        },
        '^/api/v1/(cash-flow|business-case|cronograma)/preferences': {
          target: 'http://127.0.0.1:8029',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1\/(cash-flow|business-case|cronograma)/, '/api/v1')
        },
        '^/api/v1/projects/.*/cash-flow': {
          target: 'http://127.0.0.1:8030',
          changeOrigin: true,
        },
        '^/api/v1/v2/projects/.*/cash-flow': {
          target: 'http://127.0.0.1:8030',
          changeOrigin: true,
        },
        '^/api/v1/projects/.*/business-case': {
          target: 'http://127.0.0.1:8031',
          changeOrigin: true,
        },
        '^/api/v1/v2/projects/.*/business-case': {
          target: 'http://127.0.0.1:8031',
          changeOrigin: true,
        },
        '/api/v1/business-case': {
          target: 'http://127.0.0.1:8031',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1\/business-case/, '/api/v1')
        },
        '^/api/v1/projects/.*/entregables': {
          target: 'http://127.0.0.1:8031',
          changeOrigin: true,
        },
        '/api/v1/cash-flow': {
          target: 'http://127.0.0.1:8030',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1\/cash-flow/, '/api/v1')
        },
        '^/api/v1/projects/.*/cronograma': {
          target: 'http://127.0.0.1:8032',
          changeOrigin: true,
        },
        '/api/v1/cronograma': {
          target: 'http://127.0.0.1:8032',
          changeOrigin: true
        },
        '/api': {
          target: 'http://127.0.0.1:8029',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request to 8029:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received response from 8029:', req.method, req.url, proxyRes.statusCode);
              if (proxyRes.statusCode === 307 && proxyRes.headers.location) {
                const loc = proxyRes.headers.location;
                const relative = loc.replace(/^https?:\/\/[^/]+/, '');
                proxyRes.headers.location = relative;
              }
            });
          },
        },
        '/storage': {
          target: 'http://127.0.0.1:8029',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:8029',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      target: 'esnext',
    },
  };
});

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to Fastify backend
      '/auth': 'http://localhost:3000',
      '/me': 'http://localhost:3000',
      '/admin': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          // Only proxy API calls (XHR/fetch), not page navigation
          if (req.headers.accept?.includes('text/html')) {
            return req.url; // Don't proxy, serve from Vite
          }
        },
      },
      '/connections': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/snapshots': 'http://localhost:3000',
      '/webhooks': 'http://localhost:3000',
      '/ingestion': 'http://localhost:3000',
      // Routes that share paths with frontend - proxy only XHR/fetch requests
      '/simulations': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          // Only proxy API calls (XHR/fetch), not page navigation
          if (req.headers.accept?.includes('text/html')) {
            return req.url; // Don't proxy, serve from Vite
          }
        },
      },
      '/issues': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        },
      },
      '/contracts': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        },
      },
      '/revrec': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        },
      },
      '/uploads': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        },
      },
      '/identity': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        },
      },
      '/data': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        },
      },
      '/exports': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        },
      },
      '/digests': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});


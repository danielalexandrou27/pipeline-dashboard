import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The engine (sfn-collector) serves the API. In development and `npm run preview`, /api is proxied to it
// so the page and the API share one origin and the sign-in cookie just works.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const target = env.ENGINE_URL || 'http://localhost:8080';
  const proxy = { '/api': { target, changeOrigin: false } };
  return {
    plugins: [react()],
    server: { port: 5173, host: true, proxy },
    preview: { port: 4173, host: true, proxy },
  };
});

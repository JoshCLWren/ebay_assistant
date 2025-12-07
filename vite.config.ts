import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_API_TARGET = 'http://127.0.0.1:8000';

function buildProxyConfig(target: string) {
  return {
    '/v1': {
      target,
      changeOrigin: true,
    },
    '/media': {
      target,
      changeOrigin: true,
    },
    '/static': {
      target,
      changeOrigin: true,
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = (env.VITE_API_BASE_URL || DEFAULT_API_TARGET).replace(/\/$/, '');

  return {
    plugins: [react()],
    server: {
      proxy: buildProxyConfig(apiTarget),
    },
    preview: {
      proxy: buildProxyConfig(apiTarget),
    },
  };
});

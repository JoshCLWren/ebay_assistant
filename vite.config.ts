import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';
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
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        thresholds: {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },
    },
  };
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
    setupFiles: './src/test/setup.ts',
  },
});

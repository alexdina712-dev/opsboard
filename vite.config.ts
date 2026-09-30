import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({
  // CI/dev .env values must never ship React's development runtime.
  define: command === 'build' ? { 'process.env.NODE_ENV': JSON.stringify('production') } : {},
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:4000' } },
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
}));

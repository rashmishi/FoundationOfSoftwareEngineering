import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the built app works from any path (Docker root, GitHub Pages sub-path).
  base: './',
  plugins: [react()],
  test: { include: ['src/**/*.test.js'], environment: 'node' },
});

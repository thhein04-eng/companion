import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/amortization-ui',
  plugins: [react()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  test: {
    name: 'amortization-ui',
    watch: false,
    globals: true,
    environment: 'jsdom',
    // These components are presentational wrappers over @ui-sdk/react;
    // their behavior is covered by apps/amortization-calculator-e2e.
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));

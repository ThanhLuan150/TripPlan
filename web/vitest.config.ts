import {defineConfig, mergeConfig} from 'vitest/config';
import viteConfig from './vite.config';

// Same aliases / plugins as the app (vite.config.ts), plus the test settings.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      include: ['src/__tests__/**/*.test.{ts,tsx}'],
      css: false,
      clearMocks: true,
      env: {
        VITE_API_URL: 'http://api.test',
      },
      coverage: {
        provider: 'v8',
        // every source file (types and declarations have no code)
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/__tests__/**', 'src/**/*.d.ts', 'src/**/types.ts'],
        reporter: ['text', 'lcov', 'json-summary'],
        reportsDirectory: 'coverage',
        // CI fails below these numbers
        thresholds: {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },
    },
  }),
);

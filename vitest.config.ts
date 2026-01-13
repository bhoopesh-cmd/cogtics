import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.ts',
      'apps/**/tests/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/**/src/**/*.ts',
      ],
      exclude: [
        '**/node_modules/**',
        '**/*.test.ts',
        '**/tests/**',
      ],
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@cogtics/db': './packages/db/src/index.ts',
      '@cogtics/schemas': './packages/schemas/src/index.ts',
      '@cogtics/utils': './packages/utils/src/index.ts',
      '@cogtics/connectors': './packages/connectors/src/index.ts',
      '@cogtics/revrec': './packages/revrec/src/index.ts',
    },
  },
});

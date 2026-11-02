import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bootstrap.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  noExternal: [/^@cogtics\//],
});

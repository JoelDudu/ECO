import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  bundle: true,
  minify: false,
  external: [
    // Native bindings — não fazer bundle
    'better-sqlite3',
    'sharp',
    '@prisma/client',
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'genius/index': 'src/genius/index.ts',
    'ttml/index': 'src/ttml/index.ts',
    'parsers/index': 'src/parsers/index.ts',
  },
  format: ['cjs', 'esm'],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  external: [
    '*.node',
  ],
});

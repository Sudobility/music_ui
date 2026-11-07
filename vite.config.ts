import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

// Single-entry library: one barrel (`@sudobility/music_ui`). Everything that is
// not a relative/absolute specifier stays external — this is a UI library and
// the consuming app (music_app) provides react, the @sudobility family, the
// design system and every ecosystem peer. Mirrors the web app's own build.
//
// Types are emitted by `tsc` (emitDeclarationOnly), not a vite dts plugin: the
// plugin's api-extractor rollup produced an empty entry for this re-export
// barrel. `tsc` emits a dist/index.d.ts that re-exports the tree, and
// scripts/fix-esm-imports.mjs makes its specifiers Node-resolvable.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      // Externalize every bare import (node_modules). Only this package's own
      // relative/absolute sources are bundled.
      external: (id: string) =>
        !id.startsWith('.') &&
        !id.startsWith('/') &&
        !id.startsWith('\0') &&
        !id.startsWith('@/') &&
        !/^[A-Za-z]:[\\/]/.test(id),
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: false,
    // tsc has already emitted the declaration tree into dist; don't wipe it.
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

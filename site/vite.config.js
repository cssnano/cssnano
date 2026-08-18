import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));

/** Isolated bundling prototype; Eleventy and the current Webpack output are untouched. */
export default defineConfig({
  root: siteDirectory,
  base: '/',
  resolve: {
    alias: {
      svgo: path.resolve(siteDirectory, 'node_modules/svgo/dist/svgo.browser.js'),
    },
  },
  build: {
    outDir: path.resolve(siteDirectory, '_vite-site/js'),
    emptyOutDir: true,
    manifest: true,
    // Compression sizes are measured by the artifact check, not every build.
    reportCompressedSize: false,
    rolldownOptions: {
      input: path.resolve(siteDirectory, 'src/playground.js'),
      output: {
        entryFileNames: 'playground.bundle.js',
        chunkFileNames: '[name].bundle.js',
        assetFileNames: '[name][extname]',
        codeSplitting: {
          groups: [
            { name: 'svgo', test: /[\\/]node_modules[\\/]svgo[\\/]/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  worker: {
    format: 'es',
    rolldownOptions: {
      output: {
        entryFileNames: 'playground-worker.bundle.js',
        chunkFileNames: '[name].bundle.js',
        codeSplitting: {
          groups: [
            { name: 'svgo', test: /[\\/]node_modules[\\/]svgo[\\/]/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
  },
});

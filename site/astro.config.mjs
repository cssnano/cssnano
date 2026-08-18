import { defineConfig } from 'astro/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://cssnano.github.io/cssnano',
  base: '/cssnano/',
  trailingSlash: 'always',
  outDir: path.resolve(siteDirectory, '_astro-site/'),
  vite: {
    resolve: {
      alias: {
        svgo: path.resolve(siteDirectory, 'node_modules/svgo/dist/svgo.browser.js'),
      },
    },
    build: {
      reportCompressedSize: false,
      rolldownOptions: {
        output: {
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
          codeSplitting: {
            groups: [
              { name: 'svgo', test: /[\\/]node_modules[\\/]svgo[\\/]/ },
              { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
            ],
          },
        },
      },
    },
  },
});

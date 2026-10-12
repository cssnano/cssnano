import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { shikiOptions } from './src/utils/shikiOptions.js';

const require = createRequire(
  new URL('../packages/cssnano-preset-advanced/package.json', import.meta.url)
);
const base = '/cssnano/';

export default defineConfig({
  site: 'https://cssnano.github.io/cssnano',
  base,
  trailingSlash: 'always',
  outDir: fileURLToPath(new URL('./_astro-site/', import.meta.url)),
  integrations: [sitemap()],
  markdown: {
    shikiConfig: shikiOptions,
  },
  vite: {
    resolve: {
      alias: {
        'css-declaration-sorter': require.resolve('css-declaration-sorter'),
      },
    },
    build: {
      reportCompressedSize: false,
    },
    worker: {
      format: 'es',
    },
  },
});

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { shikiOptions } from './src/utils/shikiOptions.js';

const base = '/cssnano/';

export default defineConfig({
  site: 'https://cssnano.github.io/cssnano',
  base,
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: shikiOptions,
  },
  vite: {
    build: {
      reportCompressedSize: false,
    },
    worker: {
      format: 'es',
    },
  },
});

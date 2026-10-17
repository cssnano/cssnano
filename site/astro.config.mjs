import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { shikiOptions } from './src/utils/shikiOptions.js';
import { resolvePlaygroundTargets } from './util/playgroundTargets.js';

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
    resolve: {
      // The playground is the only browser build; it embeds the targets
      // resolved here instead of bundling browserslist.
      alias: {
        '#utils/browser-targets': fileURLToPath(
          new URL('./src/utils/embeddedBrowserTargets.js', import.meta.url)
        ),
      },
    },
    define: {
      CSSNANO_PLAYGROUND_TARGETS: JSON.stringify(resolvePlaygroundTargets()),
    },
    build: {
      reportCompressedSize: false,
    },
    worker: {
      format: 'es',
    },
  },
});

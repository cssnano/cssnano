import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const base = '/cssnano/';

export default defineConfig({
  site: 'https://cssnano.github.io/cssnano',
  base,
  trailingSlash: 'always',
  outDir: path.resolve(siteDirectory, '_astro-site/'),
  integrations: [sitemap()],
  vite: {
    resolve: {
      alias: {
        svgo: path.resolve(
          siteDirectory,
          'node_modules/svgo/dist/svgo.browser.js'
        ),
        'css-declaration-sorter': require.resolve('css-declaration-sorter', {
          paths: [
            path.resolve(siteDirectory, '../packages/cssnano-preset-advanced'),
          ],
        }),
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

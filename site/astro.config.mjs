import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const postcssSvgoDirectory = path.resolve(
  siteDirectory,
  '../packages/postcss-svgo'
);
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
        // svgo's exports map hides package.json and gives `./browser` only an
        // import condition, so locate the browser build beside the CJS entry.
        svgo: path.join(
          path.dirname(
            require.resolve('svgo', { paths: [postcssSvgoDirectory] })
          ),
          'svgo.browser.js'
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

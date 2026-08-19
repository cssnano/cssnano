import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const base = '/cssnano/';

const prefix = (html) =>
  html.replace(/(\s(?:src|data)=["'])\/(?!\/|cssnano\/)/g, `$1${base}`);

async function prefixBuiltPublicAssetUrls(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await prefixBuiltPublicAssetUrls(entryPath);
    else if (entry.name.endsWith('.html'))
      await writeFile(entryPath, prefix(await readFile(entryPath, 'utf8')));
  }
}

function prefixPublicAssetUrls() {
  return {
    name: 'prefix-public-asset-urls',
    hooks: {
      'astro:build:done': ({ dir }) =>
        prefixBuiltPublicAssetUrls(fileURLToPath(dir)),
    },
  };
}

export default defineConfig({
  site: 'https://cssnano.github.io/cssnano',
  base,
  trailingSlash: 'always',
  outDir: path.resolve(siteDirectory, '_astro-site/'),
  integrations: [sitemap(), prefixPublicAssetUrls()],
  vite: {
    resolve: {
      alias: {
        svgo: path.resolve(
          siteDirectory,
          'node_modules/svgo/dist/svgo.browser.js'
        ),
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

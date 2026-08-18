import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(siteDirectory, '_astro-site');
const assetDirectory = path.join(outputDirectory, '_astro');
const playground = await readFile(path.join(outputDirectory, 'playground/index.html'), 'utf8');
const assets = await readdir(assetDirectory);
const worker = assets.find((file) => file.startsWith('playground-worker-') && file.endsWith('.js'));

if (!worker) throw new Error('Astro playground worker bundle is missing');
const workerSource = await readFile(path.join(assetDirectory, worker), 'utf8');
const imports = [...workerSource.matchAll(/import\(`([^`]+)`\)/g)].map(([, value]) => value);
if (imports.length !== 3) throw new Error(`Expected three lazy preset imports, found ${imports.length}`);
for (const preset of ['cssnano-preset-default', 'cssnano-preset-lite', 'cssnano-preset-advanced']) {
  if (!workerSource.includes(preset)) throw new Error(`Missing ${preset} from the Astro worker`);
}
if (!playground.includes(worker)) throw new Error('Playground page does not reference the Astro worker');
for (const importedAsset of imports) {
  if (!assets.includes(path.basename(importedAsset))) throw new Error(`Missing lazy preset chunk ${importedAsset}`);
}

console.log(JSON.stringify({ worker, presetChunks: imports.map((file) => path.basename(file)) }, null, 2));

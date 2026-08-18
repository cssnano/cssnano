import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(siteDirectory, '_vite-site/js');
const webpackDirectory = path.join(siteDirectory, '_site/js');
async function filesIn(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const file = path.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...(await filesIn(path.join(directory, entry.name), file)));
    else result.push(file);
  }
  return result;
}

const size = async (file) => (await stat(path.join(outputDirectory, file))).size;
const files = await filesIn(outputDirectory);
const entry = 'playground.bundle.js';
const worker = files.find((file) => path.basename(file).startsWith('playground-worker'));

if (!files.includes(entry) || !worker) throw new Error('Vite entry or worker bundle is missing');
const entrySource = await readFile(path.join(outputDirectory, entry), 'utf8');
if (!entrySource.includes('playground-worker')) throw new Error('Vite entry no longer creates the worker');

const webpackEntryBytes = (await stat(path.join(webpackDirectory, entry))).size;
const viteEntryBytes = await size(entry);
if (viteEntryBytes > webpackEntryBytes * 1.05) {
  throw new Error(`Vite entry is ${viteEntryBytes} bytes; Webpack baseline is ${webpackEntryBytes} bytes`);
}

const workerSource = await readFile(path.join(outputDirectory, worker), 'utf8');
if (!workerSource.includes('import(')) throw new Error('Vite inlined the lazy preset imports into the worker');
const initialFiles = [entry];
const presetChunks = files.filter((file) => /^src\d+\.bundle\.js$/.test(path.basename(file)));
if (presetChunks.length < 3) throw new Error('Vite did not emit three lazy preset chunks');

console.log(JSON.stringify({
  initialRequests: initialFiles.length,
  initialFiles,
  initialBytes: (await Promise.all(initialFiles.map(size))).reduce((sum, value) => sum + value, 0),
  worker,
  workerBytes: await size(worker),
  presetRequests: presetChunks.length,
  presetChunks,
  viteEntryBytes,
  webpackEntryBytes,
}, null, 2));

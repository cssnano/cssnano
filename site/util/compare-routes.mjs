import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function routes(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...(await routes(directory, relative)));
    else if (entry.name === 'index.html') result.push(`/${path.dirname(relative) === '.' ? '' : `${path.dirname(relative)}/`}`);
    else if (entry.name.endsWith('.xml')) result.push(`/${relative}`);
  }
  return result.toSorted();
}
const [eleventy, astro] = await Promise.all([routes(path.join(root, '_site')), routes(path.join(root, '_astro-site'))]);
const normalize = (route) => route.replace(/^\/cssnano\//, '/');
const a = astro.map(normalize).toSorted();
const e = eleventy.map(normalize).toSorted();
if (JSON.stringify(a) !== JSON.stringify(e)) throw new Error(`Route mismatch\nEleventy: ${e.join('\n')}\nAstro: ${a.join('\n')}`);
console.log(`Compared ${a.length} public routes successfully.`);

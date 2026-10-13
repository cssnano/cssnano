import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import presets from '../src/_data/presets.js';

const siteDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const outputDirectory = path.join(siteDirectory, 'dist');
const assetDirectory = path.join(outputDirectory, '_astro');

async function findHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findHtmlFiles(entryPath)));
    } else if (entry.name.endsWith('.html')) {
      files.push(entryPath);
    }
  }
  return files;
}

const problems = [];
// Each page gets its own summary, so search results and link previews differ.
const descriptionPages = new Map();
for (const file of await findHtmlFiles(outputDirectory)) {
  const html = await readFile(file, 'utf8');
  const page = path.relative(outputDirectory, file);
  // The site is served under /cssnano/, so root-relative URLs would 404.
  if (/(?:href|src)="\/(?!cssnano\/)/v.test(html)) {
    problems.push(`${page}: URL is not prefixed with the site base`);
  }
  // Redirect stubs carry no content, so they have no heading or description.
  const isRedirect = html.includes('http-equiv="refresh"');
  if (!isRedirect) {
    const headings = html.match(/<h1[\s>]/gv)?.length ?? 0;
    if (headings !== 1)
      problems.push(`${page}: expected one h1, found ${headings}`);
  }
  const seen = new Set();
  const duplicates = new Set();
  for (const [, id] of html.matchAll(/\sid="([^"]+)"/gv)) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  if (duplicates.size > 0) {
    problems.push(`${page}: duplicate ids ${[...duplicates].join(', ')}`);
  }
  if (!isRedirect) {
    const descriptions = [
      ...html.matchAll(/<meta name="description" content="([^"]*)"/gv),
    ];
    if (descriptions.length !== 1 || descriptions[0][1] === '') {
      problems.push(`${page}: expected one non-empty meta description`);
    } else {
      const [, description] = descriptions[0];
      if (descriptionPages.has(description)) {
        problems.push(
          `${page}: meta description repeats ${descriptionPages.get(description)}`
        );
      }
      descriptionPages.set(description, page);
    }
  }
}
if (problems.length > 0) throw new Error(problems.join('\n'));

// Run the built worker, since a bundling mistake only shows up at run time.
const worker = (await readdir(assetDirectory)).find(
  (file) => file.startsWith('playground-worker-') && file.endsWith('.js')
);
if (!worker) throw new Error('Astro playground worker bundle is missing');

// A broken playground would otherwise pass: the page must start the built
// worker, and every lazily loaded preset chunk must exist.
const playgroundHtml = await readFile(
  path.join(outputDirectory, 'playground', 'index.html'),
  'utf8'
);
if (!playgroundHtml.includes(worker)) {
  throw new Error(`Playground page does not reference ${worker}`);
}
const assetFiles = new Set(await readdir(assetDirectory));
const workerSource = await readFile(path.join(assetDirectory, worker), 'utf8');
const presetChunks = [
  ...workerSource.matchAll(/import\(\s*[`"']\.\/([^`"']+\.js)[`"']\s*\)/gv),
];
for (const [, chunk] of presetChunks) {
  if (!assetFiles.has(chunk)) {
    throw new Error(`Playground worker imports missing file ${chunk}`);
  }
}

const results = [];
globalThis.postMessage = (message) => {
  results.push(message);
};
await import(path.join(assetDirectory, worker));

for (const { packageName: preset } of presets) {
  await globalThis.onmessage({
    data: { input: 'a { z-index: 10; color: red; }', preset },
  });
  const result = results.pop();
  if (!result?.ok) {
    throw new Error(
      `Built worker failed to minify with ${preset}: ${result?.error?.message ?? 'unknown error'}`
    );
  }
}
console.log('Astro artifacts OK');

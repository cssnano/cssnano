// Drive cssnano hard on one framework so node --cpu-prof has something
// representative to profile. Usage:
//   node --cpu-prof --cpu-prof-dir=./bench-results util/bench-profile.mjs \
//     [framework-substring] [iters]
//
// Defaults to semantic-ui (largest file in the corpus), 25 iterations.

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cssnano = require('../packages/cssnano/src/index.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORKS_DIR = join(__dirname, '..', 'frameworks');

const match = process.argv[2] || 'semantic-ui';
const iters = Number(process.argv[3]) || 25;

const file = readdirSync(FRAMEWORKS_DIR).find(
  (f) => f.endsWith('.css') && f.includes(match)
);
if (!file) {
  console.error(`no framework matching "${match}"`);
  process.exit(1);
}

const source = readFileSync(join(FRAMEWORKS_DIR, file), 'utf8');
const processor = cssnano({ preset: 'default' });

console.error(
  `profiling ${file} (${(source.length / 1024).toFixed(1)} kB) x ${iters}`
);

async function main() {
  for (let i = 0; i < 3; i++) {
    const r = await processor.process(source, { from: undefined });
    void r.css;
  }

  const t0 = performance.now();
  for (let i = 0; i < iters; i++) {
    const r = await processor.process(source, { from: undefined });
    void r.css;
  }
  const elapsed = performance.now() - t0;
  console.error(
    `${iters} iters in ${elapsed.toFixed(0)} ms ` +
      `(median ~${(elapsed / iters).toFixed(1)} ms/iter)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

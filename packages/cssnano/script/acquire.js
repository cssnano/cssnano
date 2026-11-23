/**
 * Regenerates every data file derived from @webref/css, mdn-data,
 * @mdn/browser-compat-data and caniuse-lite. Run it with `pnpm acquire` after
 * bumping any of them, then `pnpm fixlint` to reformat the generated files.
 * Commit the result: a data refresh has to go through the test suite.
 *
 * The builders run in dependency order and share one webref read. The
 * property table checks itself against the freshly built shorthand structure
 * of longhands.json, never against the committed copy.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import css from '@webref/css';

import { acquire as acquireLonghands } from './merge/longhand/acquire.js';
import { acquire as acquireProperties } from './ir/acquire.js';
import { acquire as acquireColormin } from './postcss-colormin/acquire.js';
import { acquire as acquireMergeIdents } from './postcss-merge-idents/acquire.js';
import { acquire as acquireFontValues } from './postcss-minify-font-values/acquire.js';
import { acquire as acquireOrderedValues } from './postcss-ordered-values/acquire.js';
import { acquire as acquireReduceIdents } from './postcss-reduce-idents/acquire.js';
import { acquire as acquireReduceInitial } from './postcss-reduce-initial/acquire.js';

export const packageRoot = join(import.meta.dirname, '..');

/**
 * Builds every generated file from the installed packages, writing nothing.
 *
 * @return {Promise<{ files: Record<string, string>, summaries: string[] }>}
 *   File text by path relative to the package root.
 */
export async function acquireAll() {
  const webref = await css.listAll();
  const longhandsBuild = acquireLonghands({ webref });
  const longhands = JSON.parse(
    longhandsBuild.files['src/ir/data/longhands.json']
  );
  const builds = [
    longhandsBuild,
    acquireProperties({ webref, longhands }),
    acquireColormin({ webref }),
    acquireMergeIdents({ webref }),
    acquireFontValues({ webref }),
    acquireOrderedValues({ webref }),
    acquireReduceIdents({ webref }),
    acquireReduceInitial(),
  ];
  return {
    files: Object.assign({}, ...builds.map((build) => build.files)),
    summaries: builds.map((build) => build.summary),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { files, summaries } = await acquireAll();
  for (const [path, content] of Object.entries(files)) {
    const target = join(packageRoot, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  console.log(`Wrote ${Object.keys(files).length} files:`);
  for (const summary of summaries) console.log(`  ${summary}`);
}

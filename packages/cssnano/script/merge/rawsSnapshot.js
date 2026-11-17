/**
 * Prints the unminified output of the merge pass alone over the generated
 * duplicate cases and the framework stylesheets. Rule merging must keep the
 * whitespace and raws of every stylesheet, so the gate compares this output
 * between a commit and its parent.
 *
 * Usage: node packages/cssnano/script/merge/rawsSnapshot.js > snapshot.txt
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import {
  MERGE_TRANSFORMS,
  onlyTransform,
} from '../../test/merge/onlyTransform.js';
import { generateDuplicateCases } from './duplicates/generate.js';

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const CASES_PER_SEED = 40;
const frameworksDir = fileURLToPath(
  new URL('../../../../frameworks', import.meta.url)
);

/**
 * @param {string} label
 * @param {string} css
 * @return {string}
 */
function snapshotOf(label, css) {
  const root = postcss.parse(css);
  postcss([onlyTransform(MERGE_TRANSFORMS)({})])
    .process(root, {
      from: undefined,
    })
    .sync();
  return `== ${label}\n${root.toString()}\n`;
}

let out = '';
for (const seed of SEEDS) {
  for (const [index, css] of generateDuplicateCases(
    seed,
    CASES_PER_SEED
  ).entries()) {
    out += snapshotOf(`duplicate seed ${seed} case ${index}`, css);
  }
}
for (const file of readdirSync(frameworksDir).toSorted()) {
  const css = readFileSync(join(frameworksDir, file), 'utf8');
  out += snapshotOf(`framework ${file}`, css);
}
process.stdout.write(out);

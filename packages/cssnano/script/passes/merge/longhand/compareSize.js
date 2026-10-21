import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import postcss from 'postcss';
import { fuzzAgainstRevision } from '../../../../../../util/fuzzAgainstRevision.js';
const plugin = transformPlugin('mergeLonghand');
import { generateBorderSizeCases } from './lib/fuzzSizeGenerate.js';
import { transformPlugin } from '#passes/merge';

/**
 * Reports the rules the working tree minifies to more bytes than a base
 * revision does. The correctness fuzzer only checks that a rule keeps its
 * meaning, so a change that stops finding a shorter equivalent passes it.
 * This is a development tool rather than a test because it depends on a git ref.
 *
 *   node script/passes/merge/longhand/compareSize.js --base main
 *
 * With `--emit <file>` it only writes its outputs as JSON; the comparison runs
 * that mode against the base revision's plugin source.
 */

const { values } = parseArgs({
  options: {
    base: { type: 'string' },
    emit: { type: 'string' },
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '20000' },
    show: { type: 'string', default: '5' },
  },
});
const seed = Number(values.seed);
const count = Number(values.count);
const cases = generateBorderSizeCases(seed, count);

/** @return {string[]} */
function minify() {
  return cases.map(
    (css) => postcss([plugin()]).process(css, { from: undefined }).css
  );
}

if (values.emit !== undefined) {
  writeFileSync(values.emit, JSON.stringify(minify()));
} else if (values.base === undefined) {
  console.error(
    'usage: node compareSize.js --base <git-ref> [--seed n] [--count n] [--show n]'
  );
  process.exit(2);
} else {
  const directory = mkdtempSync(join(tmpdir(), 'compare-size-'));
  const file = join(directory, 'base.json');
  try {
    const { status } = fuzzAgainstRevision(
      'postcss-merge-longhand',
      values.base,
      ['--emit', file, '--seed', String(seed), '--count', String(count)],
      'compareSize.js'
    );
    if (status !== 0) {
      process.exit(status ?? 1);
    }
    const base = /** @type {string[]} */ (
      JSON.parse(readFileSync(file, 'utf8'))
    );
    const current = minify();
    const larger = cases
      .map((css, index) => index)
      .filter((index) => current[index].length > base[index].length);
    const smaller = cases.filter(
      (css, index) => current[index].length < base[index].length
    ).length;

    larger.sort((a, b) => cases[a].length - cases[b].length);
    console.log(
      `${count} rules against ${values.base}: ${larger.length} larger ` +
        `(${((100 * larger.length) / count).toFixed(2)}%), ${smaller} smaller`
    );
    for (const index of larger.slice(0, Number(values.show))) {
      console.log(
        `\n  ${cases[index]}\n  base:    ${base[index]}\n  current: ${current[index]}`
      );
    }
    process.exitCode = larger.length > 0 ? 1 : 0;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Runs the four merge bench cases without checks and prints, per case, the
 * declaration rebuilds, the chain entries they scanned and the receiving
 * walks. The counts come from the counter patches of .cache/merge-ir/, applied
 * with git apply before the run. Each patch marks itself when its module
 * loads, and the script exits 1 naming any patch whose mark is missing, so a
 * count of 0 always means nothing was counted.
 *
 * Usage: node packages/cssnano/script/passes/merge/rules/rebuildCounts.js [9b|9c]
 */
import { benchmarkCases } from '../../../../../../util/benchmark/cases/index.js';

const CASES = [
  'merge-rules-dense',
  'merge-rules-nested-declarations',
  'merge-duplicates-dense',
  'merge-pass-duplicates',
];

const form = process.argv[2] ?? '9c';
if (form !== '9b' && form !== '9c') {
  console.error(`Unknown counter form ${form}; use 9b or 9c`);
  process.exitCode = 1;
} else {
  // The import above loads the merge pass, so each patch has marked itself.
  globalThis.counterPatches ??= new Set();
  const expected = [`counter-rebuilds-${form}`, `counter-receiving-${form}`];
  const missing = expected.filter(
    (name) => !globalThis.counterPatches.has(name)
  );
  if (missing.length) {
    for (const name of missing) {
      console.error(`missing counter patch mark: ${name}`);
    }
    process.exitCode = 1;
  } else {
    console.log('case\trebuilds\tscanned\treceiving');
    for (const name of CASES) {
      const { createProcessor, css } = benchmarkCases[name];
      globalThis.rebuilds = 0;
      globalThis.scanned = 0;
      globalThis.receiving = 0;
      await createProcessor().process(css, { from: undefined });
      console.log(
        [
          name,
          globalThis.rebuilds,
          globalThis.scanned,
          globalThis.receiving,
        ].join('\t')
      );
    }
  }
}

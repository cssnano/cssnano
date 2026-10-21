import {
  FAILURE_EXIT_CODE,
  parseFuzzArgs,
} from '../../../../../../util/fuzzRunner.js';
import { processBatched } from './lib/fuzzCrossBlock.js';
import {
  assertFamilyCoverage,
  generateFamilyCases,
  mergeOracleDifference,
} from './lib/mergeOracle.js';

// The default export of the package runs preset-default.
const presetUrl = new URL('../../../../src/index.js', import.meta.url);

/**
 * Compares one input with the plugin's result for it: the plugin must
 * terminate, and the output must compute the same styles as the input.
 *
 * @param {string} input
 * @param {{css: string | undefined}} result
 * @return {{reason: string, input: string, output?: string, detail?: string} | undefined}
 */
export function checkMergePair(input, result) {
  if (result.css === undefined) return { reason: 'did not terminate', input };
  const detail = mergeOracleDifference(input, result.css);
  if (detail === undefined) return undefined;
  return {
    reason: 'computed style changed',
    input,
    output: result.css,
    detail,
  };
}

/**
 * Checks `cases` in child processes, a chunk at a time, and returns the
 * first failure with the index of its case.
 *
 * @param {{css: string}[]} cases
 * @param {number} [chunkSize]
 * @return {(NonNullable<ReturnType<typeof checkMergePair>> & {index: number}) | undefined}
 */
export function firstMergeFailure(cases, chunkSize = 100) {
  for (let start = 0; start < cases.length; start += chunkSize) {
    const chunk = cases.slice(start, start + chunkSize).map((item) => item.css);
    const results = processBatched(chunk, { pluginUrl: presetUrl });
    for (const [offset, css] of chunk.entries()) {
      const failure = checkMergePair(css, results.get(css));
      if (failure) return { ...failure, index: start + offset };
    }
  }
  return undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { seed, count } = parseFuzzArgs({
    defaultCount: 1000,
    defaultSeed: 0x5eed,
  });
  const cases = generateFamilyCases(seed, count);
  assertFamilyCoverage(cases);
  const failure = firstMergeFailure(cases);
  if (failure) {
    console.error(
      `seed=${seed} case=${failure.index} ${failure.reason}\n` +
        `input=${failure.input}\noutput=${failure.output}\n` +
        `detail=${failure.detail}`
    );
    process.exit(FAILURE_EXIT_CODE);
  }
  console.log(`${cases.length} family stylesheets, seed ${seed}, clean`);
}

import postcss from 'postcss';
import preset from '../../../../src/presets/default.js';
const mergeRules = transformPlugin('mergeRules');
import {
  generateFamilyCases,
  generateResetCases,
  mergeOracleDifference,
} from './lib/mergeOracle.js';
import { checkCascade, generateCascadeCases } from './lib/fuzzCascade.js';
import { transformPlugin } from '#passes/merge';

/**
 * The merge fuzzers as suites for
 * `util/mutation-testing/mutation-runner.js --check oracle`. `check` must read only
 * the input and the output, so that an output equal to the unmutated one
 * passes unseen; anything that runs the code again belongs in `checkRun`.
 */
export const suites = [
  {
    name: 'family',
    /**
     * @param {number} seed
     * @param {number} count
     * @return {string[]}
     */
    generate: (seed, count) =>
      generateFamilyCases(seed, count).map(({ css }) => css),
    /**
     * @param {string} input
     * @return {string}
     */
    run: (input) => postcss(preset()).process(input, { from: undefined }).css,
    /**
     * @param {string} input
     * @param {string} output
     * @return {string | undefined}
     */
    check: (input, output) => mergeOracleDifference(input, output),
  },
  {
    name: 'reset',
    /**
     * @param {number} seed
     * @param {number} count
     * @return {string[]}
     */
    generate: (seed, count) =>
      generateResetCases(seed, count).map(({ css }) => css),
    /**
     * @param {string} input
     * @return {string}
     */
    run: (input) => postcss(preset()).process(input, { from: undefined }).css,
    /**
     * @param {string} input
     * @param {string} output
     * @return {string | undefined}
     */
    check: (input, output) => mergeOracleDifference(input, output),
  },
  {
    name: 'cascade',
    /**
     * @param {number} seed
     * @param {number} count
     * @return {string[]}
     */
    generate: (seed, count) =>
      generateCascadeCases(seed, count).map(({ css }) => css),
    /**
     * @param {string} input
     * @return {string}
     */
    run: (input) =>
      postcss([mergeRules]).process(input, { from: undefined }).css,
    /**
     * Computed styles and output growth. Serving `output` for every pass
     * leaves the second-pass check to `checkRun`.
     *
     * @param {string} input
     * @param {string} output
     * @return {string | undefined}
     */
    check: (input, output) => {
      const failure = checkCascade(input, () => ({
        css: output,
        terminated: false,
      }));
      return failure && `${failure.reason} ${failure.detail ?? ''}`.trim();
    },
    /**
     * @param {string} input
     * @param {string} output
     * @param {(css: string) => string | null} run
     * @return {string | undefined}
     */
    checkRun: (input, output, run) =>
      run(output) === output ? undefined : 'second pass changed the output',
  },
];

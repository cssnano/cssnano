import postcss from 'postcss';
import plugin from '../../src/index.js';
import { differences, evaluate } from './fuzzEvaluate.js';
import { shrink } from './fuzzGenerate.js';

/**
 * Runs one `transform` declaration through the plugin and compares the
 * matrix each function specified before against the matrix its renamed (or
 * untouched) form specifies after. Shared by the seeded sweep in
 * `test/fuzz.js` and the soak run in `script/fuzz.js`.
 */

const processor = postcss([plugin()]);

/**
 * @param {string} css
 * @return {string} the plugin's output.
 */
function process(css) {
  return processor.process(css, { from: undefined }).css;
}

/**
 * @typedef {object} Mismatch
 * @property {string} input
 * @property {string} output the plugin's output, or the message it threw with.
 * @property {string} reason
 * @property {{slot: string, expected: string, actual: string}[]} slots
 */

/**
 * @param {string} css
 * @return {Mismatch|undefined} undefined when the plugin preserved the meaning.
 */
function check(css) {
  /** @type {string} */
  let output;

  try {
    output = process(css);
  } catch (error) {
    return {
      input: css,
      output: error instanceof Error ? error.message : String(error),
      reason: 'the plugin threw',
      slots: [],
    };
  }

  const match = /^a\{(?:-webkit-)?transform:(.*)\}$/.exec(css);
  const outputMatch = /^a\{(?:-webkit-)?transform:(.*)\}$/.exec(output);

  if (!match || !outputMatch) {
    return {
      input: css,
      output,
      reason: 'not a transform declaration',
      slots: [],
    };
  }

  const before = evaluate(match[1]);
  const after = evaluate(outputMatch[1]);
  const slots = differences(before, after);

  if (slots.length > 0) {
    return {
      input: css,
      output,
      reason: 'a transform function changed meaning',
      slots,
    };
  }

  return undefined;
}

/**
 * @param {string} css
 * @return {Mismatch|undefined} the failure, minimised to the functions that
 * still cause it.
 */
function checkMinimised(css) {
  const failure = check(css);

  if (failure === undefined) {
    return undefined;
  }

  return check(shrink(css, (candidate) => check(candidate) !== undefined));
}

/**
 * @param {Mismatch} failure
 * @param {number} seed
 * @return {string}
 */
function report(failure, seed) {
  const lines = [
    `seed ${seed}: ${failure.reason}`,
    `  in:  ${failure.input}`,
    `  out: ${failure.output}`,
  ];

  for (const { slot, expected, actual } of failure.slots) {
    lines.push(`  ${slot}: expected ${expected}, got ${actual}`);
  }

  return lines.join('\n');
}

export { checkMinimised, report };

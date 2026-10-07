import postcss from 'postcss';
import plugin from '../../src/index.js';
import { differences, evaluate } from './fuzzEvaluate.js';
import { shrink } from './fuzzGenerate.js';
import {
  minimise,
  report,
  runPlugin,
  threwMismatch,
} from '../../../../util/fuzzCheck.js';

/** @typedef {import('../../../../util/fuzzCheck.js').Mismatch} Mismatch */

/**
 * Runs one `transform` declaration through the plugin and compares the
 * matrix each function specified before against the matrix its renamed (or
 * untouched) form specifies after. Shared by the seeded sweep in
 * `test/fuzz.js` and the soak run in `script/fuzz.js`.
 */

const processor = postcss([plugin()]);

/**
 * @param {string} css
 * @return {Mismatch|undefined} undefined when the plugin preserved the meaning.
 */
function check(css) {
  /** @type {string} */
  let output;

  try {
    output = runPlugin(processor, css);
  } catch (error) {
    return threwMismatch(css, error);
  }

  const match = /^a\{(?:-webkit-)?transform:(.*)\}$/v.exec(css);
  const outputMatch = /^a\{(?:-webkit-)?transform:(.*)\}$/v.exec(output);

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
  return minimise(css, check, shrink);
}

export { checkMinimised, report };

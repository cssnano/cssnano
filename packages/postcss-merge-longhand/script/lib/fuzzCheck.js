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
 * Runs one rule through the plugin and compares what it meant before with what
 * it means after. Shared by the seeded sweep in `perf/fuzz.js` and the soak
 * run in `script/fuzz.js`.
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

  const before = evaluate(css);
  const after = evaluate(output);

  if (before.length !== after.length) {
    return {
      input: css,
      output,
      reason: `${before.length} rules in, ${after.length} out`,
      slots: [],
    };
  }

  for (const [index, state] of before.entries()) {
    const slots = differences(state, after[index]);

    if (slots.length > 0) {
      return { input: css, output, reason: 'the sides changed', slots };
    }
  }

  return undefined;
}

/**
 * @param {string} css
 * @return {Mismatch|undefined} the failure, minimised to the declarations that
 * still cause it.
 */
function checkMinimised(css) {
  return minimise(css, check, shrink);
}

export { checkMinimised, report };

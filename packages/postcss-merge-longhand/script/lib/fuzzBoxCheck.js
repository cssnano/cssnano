import postcss from 'postcss';
import plugin from '../../src/index.js';
import { computedValues } from './fuzzBoxOracle.js';

/** @import {Engine} from './fuzzBoxOracle.js' */

/**
 * Targets with and without the newer shorthands, and one Opera Mini, for which
 * the compatibility data holds no entry. Each lists the engines of the
 * oracle that the browsers amount to, which is how little they know: a
 * rewrite must hold in every one.
 *
 * @type {{ browsers: string[], engines: Engine[] }[]}
 */
export const boxTargets = [
  { browsers: ['chrome 120'], engines: ['modern'] },
  { browsers: ['ie 11'], engines: ['legacy'] },
  { browsers: ['chrome 120', 'op_mini all'], engines: ['modern', 'legacy'] },
  { browsers: ['safari 14'], engines: ['longhands'] },
  { browsers: ['chrome 80', 'firefox 70'], engines: ['longhands'] },
];

const processors = boxTargets.map(({ browsers }) =>
  postcss([plugin({ overrideBrowserslist: browsers })])
);

/**
 * Runs one rule through the plugin for each target and compares what every
 * physical side computes to in every writing mode before and after, in each
 * engine the target contains.
 *
 * @param {string} css
 * @return {{ input: string, output: string, reason: string } | undefined}
 */
export function checkBox(css) {
  for (const [index, processor] of processors.entries()) {
    const { browsers, engines } = boxTargets[index];
    /** @type {string} */
    let output;
    try {
      output = processor.process(css, { from: undefined }).css;
    } catch (error) {
      return {
        input: css,
        output: error instanceof Error ? error.message : String(error),
        reason: `the plugin threw for ${browsers.join(', ')}`,
      };
    }
    for (const engine of engines) {
      const expected = computedValues(css, engine);
      const actual = computedValues(output, engine);
      const differing = Object.keys(expected).filter(
        (cell) => expected[cell] !== actual[cell]
      );
      if (
        differing.length > 0 ||
        Object.keys(actual).length !== Object.keys(expected).length
      ) {
        return {
          input: css,
          output,
          reason: `a physical side computes differently in the ${engine} engine for ${browsers.join(', ')}: ${differing.slice(0, 3).join('; ')}`,
        };
      }
    }
  }
  return undefined;
}

/**
 * @param {{ input: string, output: string, reason: string }} failure
 * @return {string}
 */
export function reportBox({ input, output, reason }) {
  return `${reason}\n  in:  ${input}\n  out: ${output}`;
}

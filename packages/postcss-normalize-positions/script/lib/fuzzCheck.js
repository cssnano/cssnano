import postcss from 'postcss';
import plugin from '../../src/index.js';
import { transform as legacyTransform } from '../legacy/transform.js';

function valueOf(css) {
  return postcss.parse(css).first.first.value;
}
function process(css) {
  return postcss([plugin()]).process(css, { from: undefined }).css;
}
function outputFor(css) {
  return valueOf(process(css));
}
function firstDifference(oldOutput, newOutput) {
  const length = Math.min(oldOutput.length, newOutput.length);
  for (let i = 0; i < length; i++) if (oldOutput[i] !== newOutput[i]) return i;
  return oldOutput.length === newOutput.length ? -1 : length;
}

/** @param {string} css @param {string} branch */
function check(css, branch) {
  const input = valueOf(css);
  const oldOutput = legacyTransform(input);
  let newOutput;
  try {
    newOutput = valueOf(process(css));
  } catch (error) {
    newOutput = `THREW: ${error instanceof Error ? error.message : String(error)}`;
  }
  if (oldOutput === newOutput) return undefined;
  return {
    css,
    branch,
    oldOutput,
    newOutput,
    firstDifference: firstDifference(oldOutput, newOutput),
  };
}

function report(failure, seed, index) {
  return [
    `seed: ${seed}`,
    `case: ${index}`,
    `branch: ${failure.branch}`,
    `input: ${failure.css}`,
    `old output: ${failure.oldOutput}`,
    `new output: ${failure.newOutput}`,
    `first differing byte: ${failure.firstDifference}`,
  ].join('\n');
}
export { check, outputFor, report };

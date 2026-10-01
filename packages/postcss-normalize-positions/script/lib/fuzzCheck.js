import postcss from 'postcss';
import plugin from '../../src/index.js';
import {
  keywordOf,
  resolvePosition,
  splitTopLevel,
  wordsOf,
} from './fuzzOracle.js';

const keywords = new Set(['left', 'right', 'top', 'bottom', 'center']);

/** @typedef {import('./fuzzGenerate.js').Case} Case */
/** @typedef {import('./fuzzGenerate.js').Layer} Layer */
/** @typedef {{css: string, branch: string, output: string, reason: string}} FuzzFailure */

/** @param {string} size */
const sizeOf = (size) =>
  size ? size.slice(size.indexOf('/') + 1).trim() : undefined;

/**
 * A two-value position with `center` has a one-value form whenever the other
 * term can stand alone on its own axis: any term before `center`, or a
 * keyword after it.
 *
 * @param {string[]} terms
 */
function hasOneValueForm(terms) {
  if (terms.length !== 2) return false;
  const [first, second] = terms.map(keywordOf);
  return second === 'center' || (first === 'center' && keywords.has(second));
}

/**
 * @param {Layer} layer @param {string} output
 * @return {string | undefined} why the rewritten layer is wrong
 */
function layerFailure(layer, output) {
  const expected =
    layer.split || layer.variable ? undefined : resolvePosition(layer.terms);
  if (!expected)
    return output === layer.text
      ? undefined
      : 'rewrote a layer that is not a one- or two-value position';
  if (output.length > layer.text.length) return 'lengthened the layer';
  if (!output.startsWith(layer.before))
    return 'changed the components before the position';
  const [position, ...size] = splitTopLevel(
    output.slice(layer.before.length),
    '/'
  );
  if ((size.length ? size.join('/').trim() : undefined) !== sizeOf(layer.size))
    return 'changed the background size';
  const words = wordsOf(position);
  const actual = resolvePosition(words);
  if (actual?.join(' ') !== expected.join(' '))
    return `moved the position from ${expected.join(' ')} to ${actual?.join(' ') ?? 'an invalid value'}`;
  if (hasOneValueForm(layer.terms) && words.length !== 1)
    return 'kept center where a one-value position suffices';
  return undefined;
}

/** @param {string} css */
function process(css) {
  return postcss([plugin()]).process(css, { from: undefined }).css;
}

/**
 * Check one generated declaration: every layer keeps its offsets, invalid
 * layers stay byte-identical, and a second pass changes nothing.
 *
 * @param {Case} sample
 * @return {FuzzFailure | undefined}
 */
function check(sample) {
  const { css, branch, property, layers } = sample;
  let output;
  try {
    output = process(css);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { css, branch, output: `THREW: ${message}`, reason: 'threw' };
  }
  const prefix = `a{${property}:`;
  const value = output.slice(prefix.length, -1);
  const outputLayers = splitTopLevel(value, ',');
  /** @param {string} reason */
  const fail = (reason) => ({ css, branch, output, reason });
  if (!output.startsWith(prefix) || outputLayers.length !== layers.length)
    return fail('changed the declaration or its layer count');
  for (const [index, layer] of layers.entries()) {
    const reason = layerFailure(layer, outputLayers[index]);
    if (reason) return fail(`layer ${index + 1} ${reason}`);
  }
  if (process(output) !== output) return fail('second pass changed output');
  return undefined;
}

/** @param {FuzzFailure} failure @param {number} [seed] @param {number} [index] */
function report(failure, seed, index) {
  return [
    `seed: ${seed}`,
    `case: ${index}`,
    `branch: ${failure.branch}`,
    `input: ${failure.css}`,
    `output: ${failure.output}`,
    `reason: ${failure.reason}`,
  ].join('\n');
}

/** @param {string} css */
function outputFor(css) {
  return postcss.parse(process(css)).first?.first?.value;
}

export { check, outputFor, report };

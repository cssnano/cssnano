import cssnanoUtils from 'cssnano-utils';
import postcss from 'postcss';
import plugin from '../../src/index.js';

// Reuse the shared CSS Values 4 length set instead of a local copy so the
// oracle cannot silently drift from the units the implementation accepts.
const { lengthUnits } = cssnanoUtils;

/** @param {string} unit @return {boolean} */
function isZeroUnit(unit) {
  return unit === '' || unit === '%' || lengthUnits.has(unit);
}

/** @param {{number: number, unit: string}} current @param {{number: number, unit: string}} largest @return {boolean} */
function comparable(current, largest) {
  if (current.unit === largest.unit) return true;
  return (
    (current.number === 0 || largest.number === 0) &&
    isZeroUnit(current.unit) &&
    isZeroUnit(largest.unit)
  );
}

/** @param {string[]} texts @param {string[]} separators @return {string} */
function joinWith(texts, separators) {
  let result = '';
  for (const [index, text] of texts.entries()) {
    if (index) result += separators[index - 1];
    result += text;
  }
  return result;
}

/** @param {import('./fuzzGenerate.js').Argument[]} args @return {number} Count of leading line arguments. */
function leadingLineSpecifications(args) {
  let count = 0;
  while (count < args.length && args[count].kind === 'line') count += 1;
  return count;
}

/**
 * Collect the zero position spellings the clamping rules allow, scanning the
 * colour stops in order from the first colour stop; leading line
 * specifications never carry stop positions.
 *
 * @param {import('./fuzzGenerate.js').Argument[]} args
 * @return {Set<string>} `argIndex:positionIndex` keys with zero replacements.
 */
function clampZeroEdits(args) {
  /** @type {Set<string>} */
  const zeroEdits = new Set();
  let largest;
  let seenStop = false;
  for (const [argIndex, arg] of args.entries()) {
    if (!seenStop) {
      if (arg.kind !== 'color') continue;
      seenStop = true;
    }
    if (arg.kind === 'color' && !arg.positions.length && !largest)
      largest = { number: 0, unit: '%' };
    const positions = arg.kind === 'color' ? arg.positions : arg.tokens;
    for (const [positionIndex, current] of positions.entries()) {
      if (!current || current.number === undefined) {
        largest = undefined;
        continue;
      }
      // A zero clamps to any non-negative maximum whatever units name them,
      // so the maximum survives the rewritten spelling.
      if (
        largest &&
        largest.number >= 0 &&
        current.number === 0 &&
        isZeroUnit(current.unit)
      ) {
        zeroEdits.add(`${argIndex}:${positionIndex}`);
        continue;
      }
      if (largest && !comparable(current, largest)) {
        largest = undefined;
        continue;
      }
      if (largest && largest.number >= 0 && largest.number >= current.number) {
        zeroEdits.add(`${argIndex}:${positionIndex}`);
      } else {
        largest = { number: current.number, unit: current.unit };
      }
    }
  }
  return zeroEdits;
}

/**
 * Decide boundary position removals for the first and last colour stops and
 * drop any zero spelling they would have received.
 *
 * @param {import('./fuzzGenerate.js').Argument[]} args
 * @param {number} lineSpecifications
 * @param {Set<string>} zeroEdits
 * @return {Map<number, 'first' | 'last'>}
 */
function boundaryRemovals(args, lineSpecifications, zeroEdits) {
  /** @type {number[]} */
  const stopIndexes = [];
  for (const [index, arg] of args.entries())
    if (arg.kind === 'color') stopIndexes.push(index);
  const stopCount = stopIndexes.length;
  /** @type {Map<number, 'first' | 'last'>} */
  const removals = new Map();
  for (const slot of new Set(stopCount ? [0, stopCount - 1] : [])) {
    const argIndex = stopIndexes[slot];
    const stop = args[argIndex];
    if (stop.positions.length !== 1) continue;
    const only = stop.positions[0];
    if (only.number === undefined) continue;
    const first =
      slot === 0 &&
      argIndex === lineSpecifications &&
      only.number === 0 &&
      isZeroUnit(only.unit);
    const last =
      slot === stopCount - 1 &&
      argIndex === args.length - 1 &&
      only.number === 100 &&
      only.unit === '%';
    if (!first && !last) continue;
    removals.set(argIndex, first ? 'first' : 'last');
    zeroEdits.delete(`${argIndex}:0`);
  }
  return removals;
}

/**
 * Render the model's expected value, applying direction, zero, and boundary
 * edits, and record which edit kinds the value used.
 *
 * @param {import('./fuzzGenerate.js').Case} model
 * @param {Set<string>} zeroEdits
 * @param {Map<number, 'first' | 'last'>} removals
 * @param {{abort: boolean, direction: boolean, zero: boolean, boundaryFirst: boolean, boundaryLast: boolean, unchanged: boolean}} kinds
 * @return {string}
 */
function rebuild(model, zeroEdits, removals, kinds) {
  const texts = model.args.map((arg, argIndex) => {
    if (arg.kind === 'line') {
      if (argIndex === 0 && arg.angle) {
        kinds.direction = true;
        return arg.angle;
      }
      if (arg.tokens.length)
        return joinWith(
          arg.tokens.map((token, tokenIndex) => {
            if (zeroEdits.has(`${argIndex}:${tokenIndex}`)) {
              kinds.zero = true;
              return '0';
            }
            return token.text;
          }),
          arg.tokenSeparators
        );
      return arg.text;
    }
    if (removals.has(argIndex)) {
      kinds[
        removals.get(argIndex) === 'first' ? 'boundaryFirst' : 'boundaryLast'
      ] = true;
      return arg.color;
    }
    if (!arg.positions.length) return arg.color;
    return (
      arg.color +
      arg.colourSeparator +
      joinWith(
        arg.positions.map((position, positionIndex) => {
          if (zeroEdits.has(`${argIndex}:${positionIndex}`)) {
            kinds.zero = true;
            return '0';
          }
          return position.text;
        }),
        arg.positionSeparators
      )
    );
  });
  return model.fnName + '(' + joinWith(texts, model.argSeparators) + ')';
}

/**
 * Evaluate the colour stop contract on the generator's structural model: a
 * position clamped to the running non-negative maximum may be written as a
 * zero, the boundary stops may drop positions spelling their defaults, and a
 * `to <side>` line specification is an angle in fewer bytes. Anything holding
 * `var()` or `env()` is left alone.
 *
 * @param {import('./fuzzGenerate.js').Case} model
 * @return {{value: string, kinds: {abort: boolean, direction: boolean, zero: boolean, boundaryFirst: boolean, boundaryLast: boolean, unchanged: boolean}}}
 */
function evaluate(model) {
  /** @type {{abort: boolean, direction: boolean, zero: boolean, boundaryFirst: boolean, boundaryLast: boolean, unchanged: boolean}} */
  const kinds = {
    abort: model.aborts,
    direction: false,
    zero: false,
    boundaryFirst: false,
    boundaryLast: false,
    unchanged: false,
  };
  if (model.aborts) return { value: model.value, kinds };

  const zeroEdits = clampZeroEdits(model.args);
  const removals = boundaryRemovals(
    model.args,
    leadingLineSpecifications(model.args),
    zeroEdits
  );
  const gradient = rebuild(model, zeroEdits, removals, kinds);
  // A nesting wrapper is not itself scanned for stop positions: for the
  // gradient wrapper the inner gradient is the outer's leading colour stop,
  // whose position sits in the wrapper text, so only the inner gradient's own
  // positions are rewritten. Any layer prefix stays outside the wrapper.
  const value =
    model.prefix + model.nesting.before + gradient + model.nesting.after;
  kinds.unchanged = value === model.value;
  return { value, kinds };
}

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
  for (let index = 0; index < length; index++)
    if (oldOutput[index] !== newOutput[index]) return index;
  return oldOutput.length === newOutput.length ? -1 : length;
}

/**
 * @param {import('./fuzzGenerate.js').Case} sample
 * @return {object | undefined} A failure record when the plugin disagrees with
 *   the oracle or when minifying its own output changes it again.
 */
function check(sample) {
  const expected = evaluate(sample).value;
  let actual;
  try {
    actual = valueOf(process(sample.css));
  } catch (error) {
    actual = `THREW: ${error instanceof Error ? error.message : String(error)}`;
  }
  if (actual !== expected)
    return {
      kind: 'oracle',
      css: sample.css,
      branch: sample.branch,
      expected,
      actual,
      firstDifference: firstDifference(expected, actual),
    };
  let second;
  try {
    second = valueOf(process(`a{background-image:${actual}}`));
  } catch (error) {
    second = `THREW: ${error instanceof Error ? error.message : String(error)}`;
  }
  if (second !== actual)
    return {
      kind: 'idempotence',
      css: actual,
      branch: sample.branch,
      expected: actual,
      actual: second,
      firstDifference: firstDifference(actual, second),
    };
  return undefined;
}

function report(failure, seed, index) {
  return [
    `kind: ${failure.kind}`,
    `seed: ${seed}`,
    `case: ${index}`,
    `branch: ${failure.branch}`,
    `input: ${failure.css}`,
    `expected: ${failure.expected}`,
    `actual: ${failure.actual}`,
    `first differing byte: ${failure.firstDifference}`,
  ].join('\n');
}

export { check, evaluate, outputFor, report };

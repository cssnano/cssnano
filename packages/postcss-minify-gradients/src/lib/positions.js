/** @import {CSSToken} from '@csstools/css-tokenizer' */
import cssnanoUtils from 'cssnano-utils';

const { asciiLowerCase, lengthUnits, numeric, tokenEnd } = cssnanoUtils;

/** @typedef {{start: number, end: number, text: string}} SourceEdit */

/**
 * A position as a number and its unit, as reported by `numeric()`.
 *
 * @typedef {{number: number, unit: string}} PositionValue
 */

const angleUnits = new Set(['deg', 'grad', 'rad', 'turn']);

/**
 * A zero in the position's own dimension and a zero percentage name the same
 * gradient position, which is also what the unitless zero this plugin emits
 * denotes. Conic positions are angles and the other gradients' are lengths; a
 * zero of the other dimension is invalid there, so it must not be rewritten
 * into a valid one.
 *
 * @param {string} unit
 * @param {boolean} conic Whether the positions are `<angle-percentage>`.
 * @return {boolean}
 */
export function isPositionZeroUnit(unit, conic) {
  const lowered = asciiLowerCase(unit);
  return (
    lowered === '' ||
    lowered === '%' ||
    (conic ? angleUnits : lengthUnits).has(lowered)
  );
}

/**
 * Whether two positions are on the same scale, so their numbers can be ordered.
 * Only a length and a percentage naming zero are interchangeable.
 *
 * @param {PositionValue} current
 * @param {PositionValue} largest
 * @param {boolean} conic
 * @return {boolean}
 */
export function positionsComparable(current, largest, conic) {
  const unit = asciiLowerCase(current.unit);
  const largestUnit = asciiLowerCase(largest.unit);
  if (unit === largestUnit) return true;
  return (
    (current.number === 0 || largest.number === 0) &&
    isPositionZeroUnit(unit, conic) &&
    isPositionZeroUnit(largestUnit, conic)
  );
}

/**
 * Colour stop fixup raises a position to the largest position before it, so a
 * position at or below that non-negative maximum can be written as a zero.
 *
 * @param {readonly CSSToken[]} input
 * @param {readonly number[]} position Offsets of the position tokens.
 * @param {PositionValue | undefined} maximum Running maximum of the preceding positions.
 * @param {Map<number, SourceEdit>} edits Collects the positions reduced to a zero.
 * @param {boolean} conic
 * @return {PositionValue | undefined} The maximum the following stops clamp to.
 */
export function zeroPositionEdits(input, position, maximum, edits, conic) {
  let largest = maximum;
  for (const index of position) {
    const token = input[index];
    const current = numeric(token);
    if (!current) {
      largest = undefined;
      continue;
    }
    // A zero clamps to any non-negative maximum whatever units name them, so
    // the maximum survives the rewritten spelling instead of resetting on the
    // next pass.
    if (
      largest &&
      largest.number >= 0 &&
      current.number === 0 &&
      isPositionZeroUnit(current.unit, conic)
    ) {
      edits.set(index, { start: token[2], end: tokenEnd(token), text: '0' });
      continue;
    }
    if (largest && !positionsComparable(current, largest, conic)) {
      largest = undefined;
      continue;
    }
    if (largest && largest.number >= 0 && largest.number >= current.number) {
      edits.set(index, { start: token[2], end: tokenEnd(token), text: '0' });
    } else {
      largest = current;
    }
  }
  return largest;
}

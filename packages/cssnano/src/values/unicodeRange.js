import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/** Tokens built here have no position in a source text. */
const noPosition = -1;

/**
 * The number of trailing `?` wildcards when `start` to `end` is a wildcard
 * range: a power-of-16 size that starts at a multiple of that size.
 *
 * @param {number} start
 * @param {number} end
 * @return {number} 0 when the range is not a wildcard range
 */
function wildcardMarks(start, end) {
  const size = end - start + 1;
  let marks = 0;
  let block = 1;
  while (block < size) {
    block *= 16;
    marks++;
  }
  return block === size && marks > 0 && start % size === 0 ? marks : 0;
}

/**
 * The text of a wildcard range, such as `u+3?`, or undefined when the range
 * has no wildcards.
 *
 * @param {number} start
 * @param {number} marks
 * @param {'u' | 'U'} prefix
 * @return {string | undefined}
 */
function wildcardText(start, marks, prefix) {
  if (marks === 0) return undefined;
  const size = 16 ** marks;
  const digits = start === 0 ? '' : (start / size).toString(16);
  return `${prefix}+${digits}${'?'.repeat(marks)}`;
}

/**
 * The text of one code point, `u+41`, or of a span, `u+41-5a`.
 *
 * @param {number} start
 * @param {number} end
 * @param {'u' | 'U'} prefix
 * @return {string}
 */
function rangeText(start, end, prefix) {
  if (start === end) return `${prefix}+${start.toString(16)}`;
  return `${prefix}+${start.toString(16)}-${end.toString(16)}`;
}

/**
 * A unicode-range token for the code points from `start` to `end`, written
 * as a wildcard range when it covers a power-of-16 block, else as one code
 * point or a span.
 *
 * @param {number} start
 * @param {number} end
 * @param {'u' | 'U'} prefix
 * @return {CSSToken}
 */
function unicodeRange(start, end, prefix = 'u') {
  const marks = wildcardMarks(start, end);
  const text =
    wildcardText(start, marks, prefix) ?? rangeText(start, end, prefix);
  return /** @type {CSSToken} */ ([
    TokenType.UnicodeRange,
    text,
    noPosition,
    noPosition,
    { startOfRange: start, endOfRange: end },
  ]);
}

export { unicodeRange };

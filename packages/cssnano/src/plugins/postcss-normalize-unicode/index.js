import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { anyAffected } from '#utils/browser-bugs';
import { tokenizeMode } from '../../values/tokenizeMode.js';
import { comma } from '../../values/listSeparators.js';
import { unicodeRange } from '../../values/unicodeRange.js';

/** @import { TokenUnicodeRange } from '@csstools/css-tokenizer' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenEdit} from '../../values/valueBuffer.js' */
/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */

const { asciiLowerCase } = cssnanoUtils;
const maxCodePoint = 0x10ffff;

/**
 * @param {import('@csstools/css-tokenizer').CSSToken} token
 * @return {token is TokenUnicodeRange}
 */
function isUnicodeRangeDescriptorListToken(token) {
  return token[0] === TokenType.UnicodeRange;
}

/**
 * @param {readonly CSSToken[]} list
 * @return {{ ranges: number[], canonicalize: boolean } | null} the indexes of
 *   the ranges, or null when the list is not a comma-separated list of
 *   unicode-range tokens; canonicalize is false when a comment or an invalid
 *   range forbids rewriting the list as a union of its ranges
 */
function parseDescriptorList(list) {
  let expectsRange = true;
  let canonicalize = true;
  /** @type {number[]} */
  const ranges = [];
  for (let index = 0; index < list.length; index++) {
    const token = list[index];
    if (token[0] === TokenType.Whitespace) continue;
    if (token[0] === TokenType.Comment) {
      if (!token[1].endsWith('*/')) return null;
      canonicalize = false;
      continue;
    }
    if (expectsRange && isUnicodeRangeDescriptorListToken(token)) {
      expectsRange = false;
      ranges.push(index);
      if (!isValidRange(token)) canonicalize = false;
    } else if (!expectsRange && token[0] === TokenType.Comma) {
      expectsRange = true;
    } else {
      return null;
    }
  }
  if (expectsRange || ranges.length === 0) return null;
  return { ranges, canonicalize };
}

/**
 * A range whose start is after its end, or whose end exceeds U+10FFFF, is a
 * syntax error that browsers ignore, so it must not be rewritten.
 *
 * @param {TokenUnicodeRange} token
 * @return {boolean}
 */
function isValidRange(token) {
  const { startOfRange, endOfRange } = token[4];
  return startOfRange <= endOfRange && endOfRange <= maxCodePoint;
}

/**
 * @param {readonly CSSToken[]} a
 * @param {readonly CSSToken[]} b
 * @return {boolean} whether the two lists have the same token texts
 */
function sameTexts(a, b) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (a[index][1] !== b[index][1]) return false;
  }
  return true;
}

/**
 * The edits that rewrite a unicode-range value. A valid list without comments
 * is rebuilt as the union of its ranges. Otherwise each range is rewritten
 * where it stands, so a canonical range keeps its token.
 *
 * @param {readonly CSSToken[]} list
 * @param {boolean} isLegacy
 * @return {TokenEdit[]}
 */
function transform(list, isLegacy = false) {
  const parsed = parseDescriptorList(list);
  if (!parsed) return [];
  const { ranges, canonicalize } = parsed;
  const prefix = isLegacy ? 'U' : 'u';

  if (canonicalize) {
    // The descriptor is the union of its ranges, so sorting and joining
    // overlapping or touching ranges preserves the code point set.
    const sorted = /** @type {TokenUnicodeRange[]} */ (
      ranges.map((index) => list[index])
    );
    sorted.sort((a, b) => a[4].startOfRange - b[4].startOfRange);
    /** @type {number[]} start and end pairs of the merged ranges */
    const merged = [];
    let { startOfRange: start, endOfRange: end } = sorted[0][4];
    for (let i = 1; i < sorted.length; i++) {
      const bounds = sorted[i][4];
      if (bounds.startOfRange <= end + 1) {
        end = Math.max(end, bounds.endOfRange);
      } else {
        merged.push(start, end);
        ({ startOfRange: start, endOfRange: end } = bounds);
      }
    }
    merged.push(start, end);
    /** @type {CSSToken[]} */
    const replacement = [];
    for (let i = 0; i < merged.length; i += 2) {
      if (i > 0) replacement.push(comma());
      replacement.push(unicodeRange(merged[i], merged[i + 1], prefix));
    }
    return sameTexts(list, replacement)
      ? []
      : [{ start: 0, end: list.length, tokens: replacement }];
  }

  /** @type {TokenEdit[]} */
  const edits = [];
  for (const index of ranges) {
    const token = /** @type {TokenUnicodeRange} */ (list[index]);
    const { startOfRange, endOfRange } = token[4];
    // An invalid range keeps its bounds and only its prefix and digits are
    // lowercased, since browsers ignore it whatever its spelling.
    const rewritten = isValidRange(token)
      ? unicodeRange(startOfRange, endOfRange, prefix)
      : /** @type {CSSToken} */ ([
          TokenType.UnicodeRange,
          prefix + asciiLowerCase(token[1].slice(1)),
          -1,
          -1,
          token[4],
        ]);
    if (rewritten[1] !== token[1]) {
      edits.push({ start: index, end: index + 1, tokens: [rewritten] });
    }
  }
  return edits;
}

/**
 * The stage for one run. Browsers that ignore a unicode-range with a lowercase
 * U are IE and Edge before 16, so the prefix is kept uppercase for them.
 *
 * @param {readonly string[] | undefined} browsers
 * @return {Stage}
 */
function unicodeRangeStage(browsers) {
  const isLegacy = anyAffected(
    /** @type {readonly string[]} */ (browsers),
    'unicode-range-lowercase-u'
  );
  /** @type {Reducer} */
  const reduce = (buffer) => {
    buffer.replaceRanges(transform(buffer.tokens(), isLegacy));
  };
  return {
    forProperty: (property) => (tokenizeMode(property) ? reduce : null),
  };
}

/**
 * @typedef {object} Options
 */

/** @satisfies {StageEntry} */
const normalizeUnicode = {
  create: (options, browsers) => unicodeRangeStage(browsers),
};

export { normalizeUnicode as default };

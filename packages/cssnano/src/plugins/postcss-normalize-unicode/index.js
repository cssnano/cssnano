import { resolveTargets } from '#utils/browser-targets';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { anyAffected } from '#utils/browser-bugs';

/** @import { TokenUnicodeRange } from '@csstools/css-tokenizer' */

const { asciiLowerCase, assignValue, sourceValue } = cssnanoUtils;
const unicodeRangePropertyRegex =
  /^[uU][nN][iI][cC][oO][dD][eE]-[rR][aA][nN][gG][eE]$/v;
const maxCodePoint = 0x10ffff;

/**
 * @param {number} start
 * @param {number} end
 * @return {number} number of trailing "?" wildcards when [start, end] can be
 *   written as a wildcard range (a power-of-16 size starting at a multiple of
 *   that size), otherwise 0
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
 * @param {number} start
 * @param {number} end
 * @param {string} prefix
 * @return {string}
 */
function formatRange(start, end, prefix) {
  const marks = wildcardMarks(start, end);
  if (marks > 0) {
    const size = 16 ** marks;
    const digits = start === 0 ? '' : (start / size).toString(16);
    return `${prefix}+${digits}${'?'.repeat(marks)}`;
  }
  if (start === end) return `${prefix}+${start.toString(16)}`;
  return `${prefix}+${start.toString(16)}-${end.toString(16)}`;
}

/**
 * @param {import('@csstools/css-tokenizer').CSSToken} token
 * @return {token is TokenUnicodeRange}
 */
function isUnicodeRangeDescriptorListToken(token) {
  return token[0] === TokenType.UnicodeRange;
}

/**
 * @param {string} value
 * @return {{ ranges: TokenUnicodeRange[], canonicalize: boolean } | null} null
 *   when the value is not a comma-separated list of unicode-range tokens;
 *   canonicalize is false when a comment or an invalid range forbids rewriting
 *   the list as a union of its ranges
 */
function parseDescriptorList(value) {
  let expectsRange = true;
  let canonicalize = true;
  /** @type {TokenUnicodeRange[]} */
  const ranges = [];
  for (const token of tokenize({ css: value, unicodeRangesAllowed: true })) {
    if (token[0] === TokenType.EOF) continue;
    if (token[0] === TokenType.Whitespace) continue;
    if (token[0] === TokenType.Comment) {
      if (!token[1].endsWith('*/')) return null;
      canonicalize = false;
      continue;
    }
    if (expectsRange && isUnicodeRangeDescriptorListToken(token)) {
      expectsRange = false;
      ranges.push(token);
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
 * @param {string} value
 * @param {boolean} isLegacy
 * @return {string}
 */
function transform(value, isLegacy = false) {
  const list = parseDescriptorList(value);
  if (!list) return value;
  const { ranges, canonicalize } = list;
  const prefix = isLegacy ? 'U' : 'u';

  if (canonicalize) {
    // The descriptor is the union of its ranges, so sorting and joining
    // overlapping or touching ranges preserves the code point set.
    ranges.sort((a, b) => a[4].startOfRange - b[4].startOfRange);
    const formatted = [];
    let { startOfRange: start, endOfRange: end } = ranges[0][4];
    for (let i = 1; i < ranges.length; i++) {
      const bounds = ranges[i][4];
      if (bounds.startOfRange <= end + 1) {
        end = Math.max(end, bounds.endOfRange);
      } else {
        formatted.push(formatRange(start, end, prefix));
        ({ startOfRange: start, endOfRange: end } = bounds);
      }
    }
    formatted.push(formatRange(start, end, prefix));
    return formatted.join(',');
  }

  const chunks = [];
  let cursor = 0;
  for (const token of ranges) {
    const { startOfRange, endOfRange } = token[4];
    const transformed = isValidRange(token)
      ? formatRange(startOfRange, endOfRange, prefix)
      : prefix + asciiLowerCase(token[1].slice(1));
    if (transformed !== token[1]) {
      chunks.push(value.slice(cursor, token[2]), transformed);
      cursor = token[3] + 1;
    }
  }
  if (cursor === 0) return value;
  chunks.push(value.slice(cursor));
  return chunks.join('');
}

/**
 * @typedef {object} Options
 */

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(/** @type {Options} */ opts = {}) {
  return {
    postcssPlugin: 'postcss-normalize-unicode',

    /**
     * @param {import('postcss').Result} result
     */
    prepare(result) {
      const browsers = resolveTargets(opts, result);

      const cache = new Map();
      // IE and Edge before 16 ignore a unicode-range with a lowercase U.
      const isLegacy = anyAffected(browsers, 'unicode-range-lowercase-u');

      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls(unicodeRangePropertyRegex, (decl) => {
            const value = sourceValue(decl);

            if (cache.has(value)) {
              const newValue = cache.get(value);
              assignValue(decl, newValue);
              return;
            }

            const newValue = transform(value, isLegacy);
            assignValue(decl, newValue);
            cache.set(value, newValue);
          });
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

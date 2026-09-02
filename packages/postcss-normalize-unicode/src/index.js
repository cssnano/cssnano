import getBrowsersList from '#getBrowsersList';
import {
  isTokenUnicodeRange,
  tokenize,
  TokenType,
} from '@csstools/css-tokenizer';

/** @import browserslist from 'browserslist' */

const regexLowerCaseUPrefix = /^u(?=\+)/;
const unicodeRangeRegex = /^unicode-range$/i;

/**
 * @param {string} range
 * @return {string}
 */
function unicode(range) {
  const values = range.slice(2).split('-');

  if (values.length < 2) {
    return range;
  }

  const left = values[0].split('');
  const right = values[1].split('');

  if (left.length !== right.length) {
    return range;
  }

  const merged = mergeRangeBounds(left, right);

  if (merged) {
    return merged;
  }

  return range;
}
/**
 * @param {string[]} left
 * @param {string[]} right
 * @return {false|string}
 */
function mergeRangeBounds(left, right) {
  let questionCounter = 0;
  let group = 'u+';
  for (const [index, value] of left.entries()) {
    if (value === right[index] && questionCounter === 0) {
      group = group + value;
    } else if (value === '0' && right[index] === 'f') {
      questionCounter++;
      group = group + '?';
    } else {
      return false;
    }
  }
  // The maximum number of wildcard characters (?) for ranges is 5.
  if (questionCounter < 6) {
    return group;
  } else {
    return false;
  }
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value, isLegacy = false) {
  let result = value;
  let previousEnd = 0;
  let depth = 0;
  for (const token of tokenize({ css: value, unicodeRangesAllowed: true })) {
    if (
      token[0] === TokenType.Function ||
      token[0] === TokenType.OpenParen ||
      token[0] === TokenType.OpenSquare ||
      token[0] === TokenType.OpenCurly
    ) {
      depth++;
      continue;
    }

    if (
      token[0] === TokenType.CloseParen ||
      token[0] === TokenType.CloseSquare ||
      token[0] === TokenType.CloseCurly
    ) {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (!isTokenUnicodeRange(token) || depth > 0) {
      continue;
    }

    const normalized = unicode(token[1].toLowerCase());
    const transformed = isLegacy
      ? normalized.replace(regexLowerCaseUPrefix, 'U')
      : normalized;

    if (transformed === token[1]) {
      continue;
    }

    if (result === value) {
      result = value.slice(0, token[2]);
    } else {
      result += value.slice(previousEnd, token[2]);
    }
    result += transformed;
    previousEnd = token[3] + 1;
  }

  return result === value ? value : result + value.slice(previousEnd);
}

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
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
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(null, opts, stats, from, file, env);

      const cache = new Map();
      /**
       * IE and Edge before 16 version ignore the unicode-range if the 'U' is
       * lowercase
       *
       * https://caniuse.com/#search=unicode-range
       */
      const lowerCaseUPrefixBugBrowsers = new Set(
        getBrowsersList('ie <=11, edge <= 15')
      );
      const isLegacy = !new Set(browsers).isDisjointFrom(
        lowerCaseUPrefixBugBrowsers
      );

      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls(unicodeRangeRegex, (decl) => {
            const value = decl.raws.value?.raw ?? decl.value;

            if (cache.has(value)) {
              decl.value = cache.get(value);

              return;
            }

            const newValue = transform(value, isLegacy);

            decl.value = newValue;
            if (decl.raws.value?.raw) {
              decl.raws.value = { raw: newValue, value: newValue };
            }
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

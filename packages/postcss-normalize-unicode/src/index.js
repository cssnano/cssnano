import getBrowsersList from '#getBrowsersList';
import { tokenize, TokenType } from '@csstools/css-tokenizer';

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
 * @param {import('@csstools/css-tokenizer').CSSToken} token
 * @return {boolean}
 */
function isUnicodeRangeDescriptorListToken(token) {
  return token[0] === TokenType.UnicodeRange;
}

/**
 * @param {string} value
 * @param {boolean} isLegacy
 * @return {string}
 */
function transform(value, isLegacy = false) {
  let expectsRange = true;
  const edits = [];
  for (const token of tokenize({ css: value, unicodeRangesAllowed: true })) {
    if (token[0] === TokenType.EOF) continue;
    if (token[0] === TokenType.Whitespace) continue;
    if (token[0] === TokenType.Comment) {
      if (!token[1].endsWith('*/')) return value;
      continue;
    }
    if (expectsRange && isUnicodeRangeDescriptorListToken(token)) {
      expectsRange = false;
    } else if (!expectsRange && token[0] === TokenType.Comma) {
      expectsRange = true;
    } else {
      return value;
    }
    if (isUnicodeRangeDescriptorListToken(token)) {
      const normalized = unicode(token[1].toLowerCase());
      const transformed = isLegacy
        ? normalized.replace(regexLowerCaseUPrefix, 'U')
        : normalized;
      if (transformed !== token[1]) {
        edits.push({ start: token[2], end: token[3] + 1, text: transformed });
      }
    }
  }
  if (expectsRange || edits.length === 0) return value;
  const chunks = [];
  let cursor = 0;
  for (const edit of edits) {
    chunks.push(value.slice(cursor, edit.start), edit.text);
    cursor = edit.end;
  }
  chunks.push(value.slice(cursor));
  return chunks.join('');
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {string} value
 */
function assignValue(decl, value) {
  decl.value = value;
  if (decl.raws.value?.raw) {
    decl.raws.value = { raw: value, value };
  }
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
            const value =
              decl.raws.value?.value === decl.value
                ? (decl.raws.value.raw ?? decl.value)
                : decl.value;

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

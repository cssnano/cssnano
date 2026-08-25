import getBrowsersList from '#getBrowsersList';
import { tokenize } from '@csstools/css-tokenizer';
import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';

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
  const nodes = parseListOfComponentValues(tokenize({ css: value }));

  /**
   * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values
   * @return {string}
   */
  function serialize(values) {
    let output = '';

    for (let index = 0; index < values.length; index++) {
      const node = values[index];

      if (isTokenNode(node)) {
        let end = index + 1;
        while (
          end < values.length &&
          isTokenNode(values[end]) &&
          values[end - 1].value[3] + 1 === values[end].value[2]
        ) {
          end++;
        }

        const raw = values
          .slice(index, end)
          .map((token) => token.toString())
          .join('');

        if (/^u\+[a-f0-9?-]+$/i.test(raw)) {
          const transformed = unicode(raw.toLowerCase());
          output += isLegacy
            ? transformed.replace(regexLowerCaseUPrefix, 'U')
            : transformed;
          index = end - 1;
          continue;
        }

        output += node.toString();
        continue;
      }

      if (isFunctionNode(node) || isSimpleBlockNode(node)) {
        const source = node.toString();
        const inner = node.value.map((child) => child.toString()).join('');
        output += source.replace(inner, serialize(node.value));
      } else {
        output += node.toString();
      }
    }

    return output;
  }

  return serialize(nodes);
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
            const value = decl.value;

            if (cache.has(value)) {
              decl.value = cache.get(value);

              return;
            }

            const newValue = transform(value, isLegacy);

            decl.value = newValue;
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

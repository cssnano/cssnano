import {
  isTokenHash,
  isTokenIdent,
  isTokenNumeric,
  isTokenURL,
  tokenize,
} from '@csstools/css-tokenizer';
import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import getBrowsersList from '#getBrowsersList';
import caniuseApi from 'caniuse-api';
import minifyColor from './minifyColor.js';

const { isSupported } = caniuseApi;
/** @import browserslist from 'browserslist' */

const rgbOrHslRegex = /^(rgb|hsl)a?$/i;
const notMinifiableRegex =
  /^(composes|font|src$|filter|-webkit-tap-highlight-color)/i;
/*
 * IE 8 & 9 do not properly handle clicks on elements
 * with a `transparent` `background-color`.
 *
 * https://developer.mozilla.org/en-US/docs/Web/Events/click#Internet_Explorer
 */
const browsersWithTransparentBug = new Set(['ie 8', 'ie 9']);
const mathFunctions = new Set(['calc', 'min', 'max', 'clamp']);

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} node
 * @return {boolean}
 */
function isMathFunctionNode(node) {
  return (
    isFunctionNode(node) && mathFunctions.has(node.getName().toLowerCase())
  );
}

/**
 * Serialize component values while replacing color-bearing words and functions.
 * Keeping serialization in one pass also reproduces separator insertion when a
 * color function becomes a word.
 *
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes
 * @param {Options} options
 * @return {string}
 */
function serialize(nodes, options) {
  let output = '';

  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];

    if (isFunctionNode(node)) {
      if (rgbOrHslRegex.test(node.getName())) {
        const original = node.toString();
        const replacement = minifyColor(original, options);
        output += replacement;
        const next = nodes[index + 1];
        if (
          replacement !== original &&
          next &&
          (isFunctionNode(next) ||
            (isTokenNode(next) &&
              (isTokenNumeric(next.value) ||
                isTokenIdent(next.value) ||
                isTokenHash(next.value) ||
                isTokenURL(next.value))))
        ) {
          output += ' ';
        }
        continue;
      }

      if (isMathFunctionNode(node)) {
        output += node.toString();
      } else {
        const source = node.toString();
        const inner = node.value.map((child) => child.toString()).join('');
        output += source.replace(inner, serialize(node.value, options));
      }
      continue;
    }

    if (isSimpleBlockNode(node)) {
      const source = node.toString();
      const inner = node.value.map((child) => child.toString()).join('');
      output += source.replace(inner, serialize(node.value, options));
      continue;
    }

    if (
      isTokenNode(node) &&
      (isTokenIdent(node.value) || isTokenHash(node.value))
    ) {
      output += minifyColor(node.value[1], options);
    } else {
      output += node.toString();
    }
  }

  return output;
}

/**
 * @param {string} value
 * @param {Options} options
 * @return {string}
 */
function transform(value, options) {
  const tokens = tokenize({ css: value });
  const nodes = parseListOfComponentValues(tokens);
  return serialize(nodes, options);
}

/**
 * @param {Options} options
 * @param {string[]} browsers
 * @return {Options}
 */
function addPluginDefaults(options, browsers) {
  const defaults = {
    // Does the browser support 4 & 8 character hex notation
    transparent: new Set(browsers).isDisjointFrom(browsersWithTransparentBug),
    // Does the browser support "transparent" value properly
    alphaHex: isSupported('css-rrggbbaa', browsers),
    name: true,
  };
  return { ...defaults, ...options };
}

/**
 * @typedef {object} MinifyColorOptions
 * @property {boolean} [hex]
 * @property {boolean} [alphaHex]
 * @property {boolean} [rgb]
 * @property {boolean} [hsl]
 * @property {boolean} [name]
 * @property {boolean} [transparent]
 * @property {boolean} [transformCustomProperties] Whether to minify colors inside custom property values (default: true)
 */

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {MinifyColorOptions & AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @param {Options} config
 * @return {import('postcss').Plugin}
 */
function pluginCreator(config = {}) {
  return {
    postcssPlugin: 'postcss-colormin',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(config, stats, from, file, env);
      const cache = new Map();
      const options = addPluginDefaults(config, browsers);

      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls((decl) => {
            if (notMinifiableRegex.test(decl.prop)) {
              return;
            }

            if (
              /** @type Options */ (config).transformCustomProperties ===
                false &&
              decl.prop.startsWith('--')
            ) {
              return;
            }

            const value = decl.value;

            if (!value) {
              return;
            }

            const cacheKey = JSON.stringify({ value, options, browsers });

            if (cache.has(cacheKey)) {
              decl.value = cache.get(cacheKey);

              return;
            }

            const newValue = transform(value, options);

            decl.value = newValue;
            cache.set(cacheKey, newValue);
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

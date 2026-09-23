import getBrowsersList from '#getBrowsersList';
import caniuseApi from 'caniuse-api';
import { colordx as colord } from '@colordx/core';
import cssnanoUtils from 'cssnano-utils';
import colorPropertiesData from './data/colorProperties.json' with { type: 'json' };
import minifyColor from './minifyColor.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
const { isSupported } = caniuseApi;
const {
  applyEdits,
  asciiLowerCase,
  balancedTokens,
  decoded,
  mathFunctions,
  TokenType,
  tokenEnd,
  tokenStart,
} = cssnanoUtils;
/** @import browserslist from 'browserslist' */

const colorProperties = new Set(colorPropertiesData);
const colorFunctionRegex = /^(?:rgb|hsl)a?$|^hwb$/v;
/*
 * IE 8 & 9 do not properly handle clicks on elements
 * with a `transparent` `background-color`.
 *
 * https://developer.mozilla.org/en-US/docs/Web/Events/click#Internet_Explorer
 */
const browsersWithTransparentBug = new Set(['ie 8', 'ie 9']);
const tokensRequiringSeparator = new Set([
  TokenType.Ident,
  TokenType.Function,
  TokenType.URL,
  TokenType.BadURL,
  TokenType.Hash,
  TokenType.Number,
  TokenType.Dimension,
  TokenType.Percentage,
]);

/** @param {string} value @param {Options} options @return {string} */
function transform(value, options) {
  const structure = balancedTokens(value);
  if (!structure) {
    return value;
  }
  const input = structure.tokens;
  /** @type {{start:number,end:number,text:string}[]} */
  const replacements = [];

  /** @param {number} end @param {number} index */
  function separator(end, index) {
    const next = input[index + 1];
    return next &&
      tokensRequiringSeparator.has(next[0]) &&
      end === tokenStart(next)
      ? ' '
      : '';
  }

  for (let i = 0; i < input.length; i++) {
    const t = input[i];
    if (t[0] === TokenType.Function) {
      const name = asciiLowerCase(decoded(t));
      const closeIndex = structure.endForOpening(i);
      if (closeIndex === undefined) {
        continue;
      }
      if (name === 'url' || mathFunctions.has(name)) {
        i = closeIndex;
        continue;
      }
      if (colorFunctionRegex.test(name)) {
        const closeToken = input[closeIndex];
        const raw = value.slice(tokenStart(t), tokenEnd(closeToken));
        const inputForMinify =
          name + '(' + value.slice(tokenEnd(t), tokenEnd(closeToken));
        if (colord(inputForMinify).isValid()) {
          const out = minifyColor(inputForMinify, options);
          if (out !== raw) {
            replacements.push({
              start: tokenStart(t),
              end: tokenEnd(closeToken),
              text: out + separator(tokenEnd(closeToken), closeIndex),
            });
          }
        }
        i = closeIndex;
        continue;
      }
    } else if (t[0] === TokenType.Ident) {
      const dec = decoded(t);
      if (!dec.startsWith('#') && colord(dec).isValid()) {
        const out = minifyColor(dec, options);
        if (out !== t[1] && out.length <= t[1].length) {
          replacements.push({
            start: tokenStart(t),
            end: tokenEnd(t),
            text: out + separator(tokenEnd(t), i),
          });
        }
      }
    } else if (t[0] === TokenType.Hash) {
      const dec = decoded(t);
      const hexCandidate = '#' + dec;
      if (colord(hexCandidate).isValid()) {
        const out = minifyColor(hexCandidate, options);
        if (out !== t[1] && out.length <= t[1].length) {
          replacements.push({
            start: tokenStart(t),
            end: tokenEnd(t),
            text: out + separator(tokenEnd(t), i),
          });
        }
      }
    }
  }

  return applyEdits(value, replacements);
}

/**
 * @param {Options} options
 * @param {string[]} browsers
 * @return {Options}
 */
function addPluginDefaults(options, browsers) {
  const defaults = {
    // Does the browser support "transparent" value properly
    transparent: new Set(browsers).isDisjointFrom(browsersWithTransparentBug),
    // Does the browser support 4 & 8 character hex notation
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
            if (!decl.prop) {
              return;
            }

            const lowerProp = asciiLowerCase(decl.prop);
            if (lowerProp.startsWith('--')) {
              if (
                /** @type Options */ (config).transformCustomProperties ===
                false
              ) {
                return;
              }
            } else {
              const unprefixed = lowerProp.replace(/^-\w+-/v, '');
              if (
                (!colorProperties.has(lowerProp) &&
                  !colorProperties.has(unprefixed)) ||
                lowerProp === '-webkit-tap-highlight-color'
              ) {
                return;
              }
            }

            const rawValue =
              decl.raws.value?.value === decl.value
                ? (decl.raws.value.raw ?? decl.value)
                : decl.value;

            if (!rawValue) {
              return;
            }

            let newValue;
            if (cache.has(rawValue)) {
              newValue = cache.get(rawValue);
            } else {
              newValue = transform(rawValue, options);
              cache.set(rawValue, newValue);
            }

            decl.value = newValue;
            if (decl.raws.value?.raw) {
              decl.raws.value = { raw: newValue, value: newValue };
            }
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

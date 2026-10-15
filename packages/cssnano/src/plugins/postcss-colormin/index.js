import { resolveTargets } from '#utils/browser-targets';
import { tryMinifyColor } from './minifyColor.js';
import cssnanoUtils from '#utils';
import { supportsAll } from '#utils/browser-support';
import { anyAffected } from '#utils/browser-bugs';
import colorPropertiesData from './data/colorProperties.json' with { type: 'json' };

/** @import {CSSToken} from '@csstools/css-tokenizer' */
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
/** @import {TargetOptions} from '#utils' */

const colorProperties = new Set(colorPropertiesData);
const colorFunctionRegex = /^(?:rgb|hsl)a?$|^hwb$/v;
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

/**
 * Fast-path check for valid CSS hex colors (CSS Color 4 § 5.2):
 * Must be 3, 4, 6, or 8 hexadecimal digits.
 * @param {string} value
 * @return {boolean}
 */
function isHexColor(value) {
  const len = value.length;
  if (len !== 3 && len !== 4 && len !== 6 && len !== 8) return false;
  for (let i = 0; i < len; i++) {
    const code = value.charCodeAt(i);
    if (
      !(code >= 48 && code <= 57) &&
      !(code >= 65 && code <= 70) &&
      !(code >= 97 && code <= 102)
    ) {
      return false;
    }
  }
  return true;
}

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
        const out = tryMinifyColor(inputForMinify, options);
        if (out !== undefined && out !== raw) {
          replacements.push({
            start: tokenStart(t),
            end: tokenEnd(closeToken),
            text: out + separator(tokenEnd(closeToken), closeIndex),
          });
        }
        i = closeIndex;
        continue;
      }
    } else if (t[0] === TokenType.Ident || t[0] === TokenType.Hash) {
      const dec = decoded(t);
      const isHash = t[0] === TokenType.Hash;
      if (isHash ? !isHexColor(dec) : dec.startsWith('#')) continue;
      const candidate = isHash ? '#' + dec : dec;
      const out = tryMinifyColor(candidate, options);
      if (out !== undefined && out !== t[1] && out.length <= t[1].length) {
        replacements.push({
          start: tokenStart(t),
          end: tokenEnd(t),
          text: out + separator(tokenEnd(t), i),
        });
      }
    }
  }

  return applyEdits(value, replacements);
}

/**
 * @param {Options} options
 * @param {readonly string[]} browsers
 * @return {Options}
 */
function addPluginDefaults(options, browsers) {
  const defaults = {
    // IE 8 & 9 do not properly handle clicks on elements with a `transparent`
    // `background-color`, so the keyword is kept for them.
    transparent: !anyAffected(browsers, 'transparent-click-ie8-9'),
    // Does the browser support 4 & 8 character hex notation
    alphaHex: supportsAll(browsers, 'css-rrggbbaa'),
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
 * @typedef {MinifyColorOptions & TargetOptions} Options
 */

/**
 * @param {Options} config
 * @return {import('postcss').Plugin}
 */
function pluginCreator(config = {}) {
  return {
    postcssPlugin: 'postcss-colormin',

    /**
     * @param {import('postcss').Result} result
     */
    prepare(result) {
      const browsers = resolveTargets(config, result);
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

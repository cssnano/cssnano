import { resolveTargets } from '#utils/browser-targets';
import { tryMinifyColor } from './minifyColor.js';
import cssnanoUtils from '#utils';
import { supportsAll, targetsAreUnknown } from '#utils/browser-support';
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

  /**
   * Whether an identifier that starts with an escape directly follows the
   * token, so the two belong together. Hacks such as `\9` and `\0` are the
   * motivating case, but any escaped identifier stops minification, because
   * a browser may read the pair as a different value.
   * @param {number} index
   */
  function hasHackSuffix(index) {
    const next = input[index + 1];
    return (
      next !== undefined &&
      next[0] === TokenType.Ident &&
      tokenEnd(input[index]) === tokenStart(next) &&
      next[1].charCodeAt(0) === 0x5c
    );
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
        if (hasHackSuffix(closeIndex)) {
          i = closeIndex;
          continue;
        }
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
    // Unknown targets keep rgba(), which every browser reads. Targets older
    // than IE 11 are unsupported, so the IE 8 and 9 click bug is not checked.
    transparent: !targetsAreUnknown(browsers),
    // Does the browser support 4 & 8 character hex notation
    alphaHex: supportsAll(browsers, 'css-rrggbbaa'),
    name: true,
  };
  return { ...defaults, ...options };
}

/**
 * @typedef {object} MinifyColorOptions
 * @property {boolean} [hex] Allows hexadecimal output, such as `#f00`. (default: true)
 * @property {boolean} [alphaHex] Allows 4 and 8 digit hexadecimal output for translucent colors. (default: whether the browser targets support it)
 * @property {boolean} [rgb] Allows `rgb()` and `rgba()` output. (default: true)
 * @property {boolean} [hsl] Allows `hsl()` and `hsla()` output. (default: true)
 * @property {boolean} [name] Allows named colors, such as `red`. (default: true)
 * @property {boolean} [transparent] Allows the `transparent` keyword for a fully transparent color. Unknown browser targets keep `rgba()`. (default: whether the browser targets know `transparent`)
 * @property {boolean} [transformCustomProperties] Minifies colors inside custom property values (`--*`). (default: true)
 */

/**
 * @typedef {MinifyColorOptions} Options
 */

/**
 * Whether colormin reads the value of a property: a color property, or a
 * custom property unless transformCustomProperties is false.
 *
 * @param {string} property
 * @param {Options} config
 * @return {boolean}
 */
function readsProperty(property, config) {
  if (property === '') return false;
  const lowerProp = asciiLowerCase(property);
  if (lowerProp.startsWith('--'))
    return config.transformCustomProperties !== false;
  const unprefixed = lowerProp.replace(/^-\w+-/v, '');
  return (
    (colorProperties.has(lowerProp) || colorProperties.has(unprefixed)) &&
    lowerProp !== '-webkit-tap-highlight-color'
  );
}

/**
 * The stage for one run. The browser targets come from the result, so the
 * stage is built per run, and it keeps its own cache of transformed values.
 *
 * @param {Options} config
 * @param {import('postcss').Result} result
 * @return {import('../../pipeline/host.js').ValueStage}
 */
function colorminStage(config, result) {
  const browsers = resolveTargets(config, result);
  const options = addPluginDefaults(config, browsers);
  const cache = new Map();
  /** @type {import('../../pipeline/host.js').Reducer} */
  const reduce = (buffer) => {
    const text = buffer.text();
    let out = cache.get(text);
    if (out === undefined) {
      out = transform(text, options);
      cache.set(text, out);
    }
    if (out !== text) buffer.replaceText(out);
  };
  return {
    forProperty: (property) =>
      readsProperty(property, config) ? reduce : null,
  };
}

/** @type {import('../../pipeline/host.js').StageDescriptor} */
const colormin = { build: colorminStage };

export { colormin as default };

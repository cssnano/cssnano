import { tryMinifyColor } from './minifyColor.js';
import cssnanoUtils from '#utils';
import { supportsAll, targetsAreUnknown } from '#utils/browser-support';
import colorPropertiesData from './data/colorProperties.json' with { type: 'json' };
import { hash, ident, whitespace } from '../../values/tokenConstructors.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
const {
  asciiLowerCase,
  decoded,
  mathFunctions,
  tokens,
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

/**
 * The tokens that spell a minified color: a hash, an identifier, or the
 * tokens of a function form.
 *
 * @param {string} out the minified color
 * @return {CSSToken[]}
 */
function colorTokens(out) {
  if (out.charCodeAt(0) === 0x23) return [hash(out.slice(1))];
  if (!out.includes('(')) return [ident(out)];
  return tokens(out);
}

/**
 * The whitespace that keeps a color apart from a token that follows it, when
 * the two touch.
 *
 * @param {readonly CSSToken[]} input
 * @param {number} end
 * @param {number} index the index of the token that ends at `end`
 * @return {CSSToken[]}
 */
function separatorAfter(input, end, index) {
  const next = input[index + 1];
  return next &&
    tokensRequiringSeparator.has(next[0]) &&
    end === tokenStart(next)
    ? [whitespace()]
    : [];
}

/**
 * Whether an identifier that starts with an escape directly follows the
 * token, so the two belong together. Hacks such as `\9` and `\0` are the
 * motivating case, but any escaped identifier stops minification, because a
 * browser may read the pair as a different value.
 *
 * @param {readonly CSSToken[]} input
 * @param {number} index
 * @return {boolean}
 */
function hasHackSuffix(input, index) {
  const next = input[index + 1];
  return (
    next !== undefined &&
    next[0] === TokenType.Ident &&
    tokenEnd(input[index]) === tokenStart(next) &&
    next[1].charCodeAt(0) === 0x5c
  );
}

/**
 * The edit that replaces a color function, from its name to its `)`, with
 * the minified color. Undefined when colordx keeps the function as it is.
 *
 * @param {readonly CSSToken[]} input
 * @param {number} index the function token
 * @param {number} closeIndex its `)`
 * @param {Options} options
 * @return {import('../../values/valueBuffer.js').TokenEdit | undefined}
 */
function functionEdit(input, index, closeIndex, options) {
  const t = input[index];
  let body = '';
  for (let i = index + 1; i <= closeIndex; i++) {
    body += input[i][1];
  }
  const out = tryMinifyColor(asciiLowerCase(decoded(t)) + '(' + body, options);
  if (out === undefined || out === t[1] + body) return;
  return {
    start: index,
    end: closeIndex + 1,
    tokens: [
      ...colorTokens(out),
      ...separatorAfter(input, tokenEnd(input[closeIndex]), closeIndex),
    ],
  };
}

/**
 * The edit that replaces an identifier or a hash with a shorter color, or
 * undefined when the token is no color or cannot get shorter.
 *
 * @param {readonly CSSToken[]} input
 * @param {number} index
 * @param {Options} options
 * @return {import('../../values/valueBuffer.js').TokenEdit | undefined}
 */
function identEdit(input, index, options) {
  const t = input[index];
  const dec = decoded(t);
  const isHash = t[0] === TokenType.Hash;
  if (isHash ? !isHexColor(dec) : dec.startsWith('#')) return;
  const out = tryMinifyColor(isHash ? '#' + dec : dec, options);
  if (out === undefined || out === t[1] || out.length > t[1].length) return;
  return {
    start: index,
    end: index + 1,
    tokens: [...colorTokens(out), ...separatorAfter(input, tokenEnd(t), index)],
  };
}

/**
 * The token edits that replace each color the value holds with its minified
 * form. Undefined when the buffer's tokens are unbalanced.
 *
 * @param {import('../../values/valueBuffer.js').ValueBuffer} buffer
 * @param {Options} options
 * @return {import('../../values/valueBuffer.js').TokenEdit[] | undefined}
 */
function transform(buffer, options) {
  const structure = buffer.structure();
  if (!structure) {
    return;
  }
  const input = structure.tokens;
  /** @type {import('../../values/valueBuffer.js').TokenEdit[] | undefined} */
  let edits;
  for (let i = 0; i < input.length; i++) {
    const t = input[i];
    if (t[0] === TokenType.Function) {
      const closeIndex = structure.endForOpening(i);
      if (closeIndex === undefined) {
        continue;
      }
      const name = asciiLowerCase(decoded(t));
      if (name === 'url' || mathFunctions.has(name)) {
        i = closeIndex;
        continue;
      }
      if (colorFunctionRegex.test(name)) {
        const edit = hasHackSuffix(input, closeIndex)
          ? undefined
          : functionEdit(input, i, closeIndex, options);
        if (edit) (edits ??= []).push(edit);
        i = closeIndex;
      }
    } else if (t[0] === TokenType.Ident || t[0] === TokenType.Hash) {
      const edit = identEdit(input, i, options);
      if (edit) (edits ??= []).push(edit);
    }
  }
  return edits;
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
 * Compiles the supported color forms for the browser targets.
 *
 * @param {Options} config
 * @param {readonly string[] | undefined} browsers
 * @return {import('../../pipeline/host.js').Stage}
 */
function compileColormin(config, browsers) {
  const options = addPluginDefaults(
    config,
    /** @type {readonly string[]} */ (browsers)
  );
  /** @type {import('../../pipeline/host.js').Reducer} */
  const reduce = (buffer) => {
    const edits = transform(buffer, options);
    if (edits) buffer.replaceRanges(edits);
  };
  return {
    forProperty: (property) =>
      readsProperty(property, config) ? reduce : null,
  };
}

/** @satisfies {import('../../pipeline/host.js').StageEntry} */
const colormin = { create: compileColormin };

export { colormin as default };

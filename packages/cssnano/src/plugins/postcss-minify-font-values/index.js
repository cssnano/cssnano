import { minifyWeightTokens } from './lib/minify-weight.js';
import { minifyFamilyTokens } from './lib/minify-family.js';
import { minifyFontTokens } from './lib/minify-font.js';
import cssnanoUtils from '#utils';
import { parsedValueTokens } from '../../utils/parsedValueText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */

const { asciiLowerCase } = cssnanoUtils;

/**
 * Whether two token lists spell the same text, compared token by token so
 * that no string is built.
 *
 * @param {readonly CSSToken[]} a
 * @param {readonly CSSToken[]} b
 * @return {boolean}
 */
function sameText(a, b) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (a[index][1] !== b[index][1]) return false;
  }
  return true;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @return {boolean}
 */
function hasVariableFunction(tokens) {
  return tokens.some((token) => {
    const lowerCasedValue = asciiLowerCase(token[1]);
    return lowerCasedValue.includes('var(') || lowerCasedValue.includes('env(');
  });
}

/**
 * @typedef {object} Options
 * @property {boolean} [removeAfterKeyword] Removes the font families that follow a font keyword, such as `sans-serif`. (default: false)
 * @property {boolean} [removeDuplicates] Removes duplicated font families. (default: true)
 * @property {boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight')} [removeQuotes] Removes quotes from font families. A function chooses the property to change for each one. (default: true)
 */

/** @type {Map<string, (tokens: readonly CSSToken[], opts: Options, removeQuotes: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight') | undefined) => CSSToken[]>} */
const propertyMinifiers = new Map([
  [
    'font-weight',
    (tokens) =>
      hasVariableFunction(tokens) ? [...tokens] : minifyWeightTokens(tokens),
  ],
  [
    'font-family',
    (tokens, opts, removeQuotes) =>
      hasVariableFunction(tokens)
        ? [...tokens]
        : minifyFamilyTokens(tokens, opts, removeQuotes),
  ],
  [
    'font',
    (tokens, opts, removeQuotes) =>
      minifyFontTokens(tokens, opts, removeQuotes),
  ],
]);

/**
 * The reducer of one property. It minifies the value as PostCSS parses it, so
 * a comment that PostCSS drops is gone. It writes only a change. When the
 * function of `removeQuotes` maps the property to a name that is not a font
 * property, the property has no reducer.
 *
 * @param {Options} opts the options with defaults applied
 * @param {string} prop
 * @return {Reducer | null}
 */
function reducerOf(opts, prop) {
  let targetType = asciiLowerCase(prop);
  let removeQuotes = opts.removeQuotes;

  if (typeof opts.removeQuotes === 'function') {
    targetType = opts.removeQuotes(prop) || targetType;
    removeQuotes = true;
  }

  const minifier = propertyMinifiers.get(targetType);
  if (!minifier) return null;
  return (buffer) => {
    const tokens = buffer.tokens();
    if (tokens.length === 0) return;
    const parsed = parsedValueTokens(tokens);
    const out = minifier(parsed, opts, removeQuotes);
    if (!sameText(out, parsed)) {
      buffer.replace(0, tokens.length, out);
    }
  };
}

/**
 * The stage for one run. Its options are the preset's, with the plugin's
 * defaults under them.
 *
 * @param {Options} opts
 * @return {Stage}
 */
function fontStage(opts) {
  const normalizedOpts = {
    removeAfterKeyword: false,
    removeDuplicates: true,
    removeQuotes: true,
    ...opts,
  };
  return {
    forProperty: (property) => reducerOf(normalizedOpts, property),
  };
}

/** @satisfies {StageEntry} */
const minifyFontValues = {
  create: (/** @type {Options} */ options) => fontStage(options),
};

export { minifyFontValues as default };

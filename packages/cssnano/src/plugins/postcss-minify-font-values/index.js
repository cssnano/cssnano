import minifyWeight from './lib/minify-weight.js';
import minifyFamily from './lib/minify-family.js';
import minifyFont from './lib/minify-font.js';
import cssnanoUtils from '#utils';
import { parsedValueText } from '../../utils/parsedValueText.js';

/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */

const { asciiLowerCase } = cssnanoUtils;

/**
 * @param {string} value
 * @return {boolean}
 */
function hasVariableFunction(value) {
  const lowerCasedValue = asciiLowerCase(value);

  return lowerCasedValue.includes('var(') || lowerCasedValue.includes('env(');
}

/** @type {Map<string, (value: string, opts: Options, removeQuotes: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight') | undefined) => string>} */
const propertyMinifiers = new Map([
  [
    'font-weight',
    (value) => (hasVariableFunction(value) ? value : minifyWeight(value)),
  ],
  [
    'font-family',
    (value, opts, removeQuotes) =>
      hasVariableFunction(value)
        ? value
        : minifyFamily(value, opts, removeQuotes),
  ],
  [
    'font',
    (value, opts, removeQuotes) => minifyFont(value, opts, removeQuotes),
  ],
]);

/**
 * @typedef {object} Options
 * @property {boolean} [removeAfterKeyword] Removes the font families that follow a font keyword, such as `sans-serif`. (default: false)
 * @property {boolean} [removeDuplicates] Removes duplicated font families. (default: true)
 * @property {boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight')} [removeQuotes] Removes quotes from font families. A function chooses the property to change for each one. (default: true)
 */

/**
 * The reducer of one property. It minifies the value as PostCSS gives it, so
 * a comment is gone, and writes only a change. When the function of
 * `removeQuotes` maps the property to a name that is not a font property, the
 * property has no reducer.
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
    const text = buffer.text();
    if (!text) return;
    // PostCSS gives the value without comments, so minify that text.
    const value = text.includes('/*') ? parsedValueText(buffer.tokens()) : text;
    const out = minifier(value, opts, removeQuotes);
    if (out !== value) buffer.replaceText(out);
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

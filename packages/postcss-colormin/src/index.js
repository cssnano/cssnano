import getBrowsersList from '#getBrowsersList';
import caniuseApi from 'caniuse-api';
import cssnanoUtils from 'cssnano-utils';
import minifyColor from './minifyColor.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
const { isSupported } = caniuseApi;
const { applyEdits, TokenType, tokenEnd, tokenStart, tokens } = cssnanoUtils;
/** @import browserslist from 'browserslist' */

const rgbOrHslRegex = /^(?:rgb|hsl)a?$/i;
const notMinifiableRegex =
  /^(?:composes|font|src$|filter|-webkit-tap-highlight-color)/i;
/*
 * IE 8 & 9 do not properly handle clicks on elements
 * with a `transparent` `background-color`.
 *
 * https://developer.mozilla.org/en-US/docs/Web/Events/click#Internet_Explorer
 */
const browsersWithTransparentBug = new Set(['ie 8', 'ie 9']);
const mathFunctions = new Set(['calc', 'min', 'max', 'clamp']);
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
  /** @type {CSSToken[]} */ const input = tokens(value);
  /** @type {{start:number,end:number,text:string}[]} */ const replacements =
    [];
  /** @type {{token: CSSToken, name: string, skipChildren: boolean, isMath: boolean}[]} */
  const stack = [];
  let mathDepth = 0;
  let skipDepth = 0;
  /** @param {number} end @param {number} index */
  function separator(end, index) {
    const next = input[index + 1];
    return next &&
      tokensRequiringSeparator.has(next[0]) &&
      value.slice(end, tokenStart(next)) === ''
      ? ' '
      : '';
  }
  for (let i = 0; i < input.length; i++) {
    const t = input[i];
    if (t[0] === TokenType.Function) {
      const name = t[1].slice(0, -1).toLowerCase();
      const isMath = mathFunctions.has(name);
      const isColor = rgbOrHslRegex.test(name);
      stack.push({
        token: t,
        name,
        skipChildren: isMath || isColor,
        isMath,
      });
      if (isMath) mathDepth++;
      if (isMath || isColor) skipDepth++;
    } else if (t[0] === TokenType.CloseParen && stack.length) {
      const entry = stack.pop();
      if (!entry) continue;
      if (entry.isMath) mathDepth--;
      if (entry.skipChildren) skipDepth--;
      if (mathDepth === 0) {
        const { token: f, name } = entry;
        if (!rgbOrHslRegex.test(name)) continue;
        const raw = value.slice(tokenStart(f), tokenEnd(t));
        const out = minifyColor(raw, options);
        if (out !== raw) {
          replacements.push({
            start: tokenStart(f),
            end: tokenEnd(t),
            text: out + separator(tokenEnd(t), i),
          });
        }
      }
    } else if (
      (t[0] === TokenType.Ident || t[0] === TokenType.Hash) &&
      skipDepth === 0
    ) {
      const out = minifyColor(t[1], options);
      if (out !== t[1])
        replacements.push({
          start: tokenStart(t),
          end: tokenEnd(t),
          text: out + separator(tokenEnd(t), i),
        });
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

import { tokenize, TokenType } from '@csstools/css-tokenizer';
import { optimize } from 'svgo';
import { encode, decode } from './lib/url.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
const PLUGIN = 'postcss-svgo';
const dataURI = /data:image\/svg\+xml(?:;(?:(?:charset=)?(?:utf-8|base64)))?,/i;
const dataURIBase64 = /data:image\/svg\+xml;base64,/i;

// the following regex will globally match:
// \b([\w-]+)       --> a word (a sequence of one or more [alphanumeric|underscore|dash] characters; followed by
// \s*=\s*          --> an equal sign character (=) between optional whitespaces; followed by
// \\"([\S\s]+?)\\" --> any characters (including whitespaces and newlines) between literal escaped quotes (\")
const escapedQuotes = /\b([\w-]+)\s*=\s*\\"([\S\s]+?)\\"/g;

/**
 * @param {string} input the SVG string
 * @param {Options} opts
 * @return {{result: string, isUriEncoded: boolean}} the minification result
 */
function minifySVG(input, opts) {
  let svg = input;
  let decodedUri, isUriEncoded;
  try {
    decodedUri = decode(input);
    isUriEncoded = decodedUri !== input;
  } catch {
    // Swallow exception if we cannot decode the value
    isUriEncoded = false;
  }

  if (isUriEncoded) {
    svg = /** @type {string} */ (decodedUri);
  }

  if (opts.encode !== undefined) {
    isUriEncoded = opts.encode;
  }

  // normalize all escaped quote characters from svg attributes
  // from <svg attr=\"value\"... /> to <svg attr="value"... />
  // see: https://github.com/cssnano/cssnano/issues/1194
  svg = svg.replace(escapedQuotes, '$1="$2"');

  const result = optimize(svg, opts);

  return {
    result: /** @type {import('svgo').Output}*/ (result).data,
    isUriEncoded,
  };
}

/** @param {string} value @param {Options} opts @return {{value: string, quote: string} | undefined} */
function optimizeDataUri(value, opts) {
  if (dataURIBase64.test(value)) {
    const url = new URL(value);
    const base64String = `${url.protocol}${url.pathname}`.replace(dataURI, '');
    const svg = Buffer.from(base64String, 'base64').toString('utf8');
    const { result } = minifySVG(svg, opts);
    const data = Buffer.from(result).toString('base64');
    return { value: 'data:image/svg+xml;base64,' + data + url.hash, quote: '' };
  }
  if (!dataURI.test(value)) return undefined;
  const svg = value.replace(dataURI, '');
  const { result, isUriEncoded } = minifySVG(svg, opts);
  const data = (isUriEncoded ? encode(result) : result).replace(/#/g, '%23');
  return {
    value: 'data:image/svg+xml;charset=utf-8,' + data,
    quote: isUriEncoded ? '"' : "'",
  };
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {Options} opts
 * @param {import('postcss').Result} postcssResult
 * @return {void}
 */
function minify(decl, opts, postcssResult) {
  const original = decl.value;
  /** @type {CSSToken[]} */ const tokens = [...tokenize({ css: original })];
  /** @type {[number, number, string][]} */ const replacements = [];
  for (let i = 0; i < tokens.length; i++) {
    const functionToken = tokens[i];
    let close = i + 1;
    let prefix;
    let value;
    let quote;
    if (
      functionToken[0] === TokenType.URL ||
      functionToken[0] === TokenType.BadURL
    ) {
      prefix = functionToken[1].slice(0, functionToken[1].indexOf('(') + 1);
      value =
        functionToken[4]?.value ?? functionToken[1].slice(prefix.length, -1);
      quote = '';
      close = i + 1;
    } else {
      if (
        functionToken[0] !== TokenType.Function ||
        functionToken[1].slice(0, -1).toLowerCase() !== 'url'
      )
        continue;
      let depth = 1;
      for (; close < tokens.length && depth; close++) {
        if (tokens[close][0] === TokenType.Function) depth++;
        if (tokens[close][0] === TokenType.CloseParen) depth--;
      }
      if (depth) continue;
      const content = tokens
        .slice(i + 1, close - 1)
        .filter((token) => token[0] !== TokenType.Whitespace);
      if (content.length !== 1 || content[0][0] !== TokenType.String) continue;
      value = content[0][1].slice(1, -1);
      quote = content[0][1][0];
      prefix = functionToken[1];
    }

    try {
      const optimized = optimizeDataUri(value, opts);
      if (!optimized) return;
      value = optimized.value;
      quote = optimized.quote || quote;
    } catch (error) {
      decl.warn(postcssResult, `${error}`);
      return;
    }
    replacements.push([
      functionToken[2],
      tokens[close - 1][3] + 1,
      prefix + quote + value + quote + ')',
    ]);
    i = close - 1;
  }
  let result = original;
  for (const [a, b, text] of replacements.toReversed())
    result = result.slice(0, a) + text + result.slice(b);
  decl.value = result;
}
/** @typedef {{encode?: boolean} & import('svgo').Config} Options */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: PLUGIN,
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers}  helpers
     */
    OnceExit(css, { result }) {
      css.walkDecls((decl) => {
        if (!dataURI.test(decl.value)) {
          return;
        }

        minify(decl, opts, result);
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

import { TokenType } from '@csstools/css-tokenizer';
import { optimize } from 'svgo';
import cssnanoUtils from 'cssnano-utils';
import { encode, decode } from './lib/url.js';

const PLUGIN = 'postcss-svgo';
const { asciiLowerCase, balancedTokens, decoded } = cssnanoUtils;
const dataURI =
  /^data:image\/svg\+xml(?:;(?:(?:charset=)?(?:utf-8|base64)))?,/v;
const dataURIBase64 = /^data:image\/svg\+xml;base64,/v;
const svgDataURI =
  /[dD][aA][tT][aA]:[iI][mM][aA][gG][eE]\/[sS][vV][gG]\+[xX][mM][lL]/v;

// the following regex will globally match:
// \b([\w-]+)       --> a word (a sequence of one or more [alphanumeric|underscore|dash] characters; followed by
// \s*=\s*          --> an equal sign character (=) between optional whitespaces; followed by
// \\"([\S\s]+?)\\" --> any characters (including whitespaces and newlines) between literal escaped quotes (\")
const escapedQuotes = /\b([\w\-]+)\s*=\s*\\"([\S\s]+?)\\"/gv;

/**
 * @param {string} svg the SVG string
 * @param {Options} opts
 * @return {string} the minified SVG string
 */
function minifySVG(svg, opts) {
  // normalize all escaped quote characters from svg attributes
  // from <svg attr=\"value\"... /> to <svg attr="value"... />
  // see: https://github.com/cssnano/cssnano/issues/1194
  const normalized = svg.replace(escapedQuotes, '$1="$2"');

  const result = optimize(normalized, opts);

  return /** @type {import('svgo').Output}*/ (result).data;
}

/** @param {string} value @param {Options} opts @return {{value: string, quote: string} | undefined} */
function optimizeDataUri(value, opts) {
  const comma = value.indexOf(',');
  if (comma === -1) return undefined;
  const loweredPrefix = asciiLowerCase(value.slice(0, comma + 1));
  if (dataURIBase64.test(loweredPrefix)) {
    const rawPayload = value.slice(comma + 1);
    const hash = rawPayload.indexOf('#');
    const base64String = rawPayload.slice(0, hash === -1 ? undefined : hash);
    const svg = Buffer.from(base64String, 'base64').toString('utf8');
    const result = minifySVG(svg, opts);
    const data = Buffer.from(result).toString('base64');
    const hashString = hash === -1 ? '' : rawPayload.slice(hash);
    return {
      value: 'data:image/svg+xml;base64,' + data + hashString,
      quote: '',
    };
  }
  const prefix = dataURI.exec(loweredPrefix)?.[0];
  if (!prefix) return undefined;
  const rawPayload = value.slice(prefix.length);
  const decodedUri = decode(rawPayload);
  let isUriEncoded = decodedUri !== rawPayload;

  if (opts.encode !== undefined) {
    isUriEncoded = opts.encode;
  }

  const result = minifySVG(decodedUri, opts);
  const data = (isUriEncoded ? encode(result) : result).replace(/#/gv, '%23');
  return {
    value: 'data:image/svg+xml;charset=utf-8,' + data,
    quote: isUriEncoded ? '"' : "'",
  };
}

/** @param {string} value @param {string} quote @return {string} */
function escapeForQuote(value, quote) {
  if (!quote) return value;
  return value.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`);
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {Options} opts
 * @param {import('postcss').Result} postcssResult
 * @return {void}
 */
function minify(decl, opts, postcssResult) {
  const original = decl.value;
  const balanced = balancedTokens(original);
  if (!balanced) return;
  const tokens = balanced.tokens;
  /** @type {[number, number, string][]} */ const replacements = [];
  for (let i = 0; i < tokens.length; i++) {
    const functionToken = tokens[i];
    let close;
    let prefix;
    let value;
    let quote;
    if (functionToken[0] === TokenType.URL) {
      prefix = functionToken[1].slice(0, functionToken[1].indexOf('(') + 1);
      value = decoded(functionToken);
      quote = '';
      // TokenType.URL spans the entire construct; i will advance on loop increment.
      close = i;
    } else {
      if (
        functionToken[0] !== TokenType.Function ||
        asciiLowerCase(decoded(functionToken)) !== 'url'
      )
        continue;
      close = balanced.endForOpening(i);
      if (close === undefined) continue;
      const content = tokens
        .slice(i + 1, close)
        .filter(
          (token) =>
            token[0] !== TokenType.Whitespace && token[0] !== TokenType.Comment
        );
      if (content.length !== 1 || content[0][0] !== TokenType.String) continue;
      value = decoded(content[0]);
      quote = content[0][1][0];
      prefix = functionToken[1];
    }

    try {
      const optimized = optimizeDataUri(value, opts);
      if (!optimized) continue;
      value = optimized.value;
      quote = optimized.quote || quote;
      value = escapeForQuote(value, quote);
    } catch (error) {
      decl.warn(postcssResult, `${error}`);
      continue;
    }
    replacements.push([
      functionToken[2],
      functionToken[0] === TokenType.URL
        ? functionToken[3] + 1
        : tokens[close][3] + 1,
      prefix + quote + value + quote + ')',
    ]);
    i = close ?? i;
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
        if (!svgDataURI.test(decl.value)) {
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

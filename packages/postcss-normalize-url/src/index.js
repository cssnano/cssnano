import path from '#path';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import normalize from './normalize.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * A `quote` assignment target for value-parser nodes that aren't otherwise
 * typed: retags the node as a (possibly unquoted) string node.
 * @typedef {{ quote?: string }} QuotedNode
 */

const multiline = /\\[\r\n]/;
// eslint-disable-next-line no-useless-escape
const escapeChars = /([\s\(\)"'])/g;

// Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
// Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;
// Windows paths like `c:\`
const WINDOWS_PATH_REGEX = /^[a-zA-Z]:\\/;
const dataUrlRegex = /^data:(.*)?,/i;
const extensionRegex = /^.+-extension:\//i;

/**
 * Originally in sindresorhus/is-absolute-url
 *
 * @param {string} url
 */
function isAbsolute(url) {
  if (WINDOWS_PATH_REGEX.test(url)) {
    return false;
  }
  return ABSOLUTE_URL_REGEX.test(url);
}

/**
 * @param {string} url
 * @return {string}
 */
function convert(url) {
  if (isAbsolute(url) || url.startsWith('//')) {
    let normalizedURL;

    try {
      normalizedURL = normalize(url);
    } catch {
      normalizedURL = url;
    }

    return normalizedURL;
  }

  // `path.normalize` always returns backslashes on Windows, need replace in `/`
  return path.normalize(url).replace(new RegExp('\\' + path.sep, 'g'), '/');
}

/**
 * @param {import('postcss').AtRule} rule
 * @return {void}
 */
function transformNamespace(rule) {
  const value = rule.params;
  /** @type {CSSToken[]} */ const tokens = [...tokenize({ css: value })];
  /** @type {[number, number, string][]} */ const replacements = [];
  forEachUrl(
    value,
    (start, end, raw) => {
      replacements.push([start, end, `"${raw.trim()}"`]);
    },
    tokens
  );
  for (const token of tokens) {
    if (token[0] !== TokenType.String) continue;
    const quote = token[1][0];
    replacements.push([
      token[2],
      token[3] + 1,
      `${quote}${token[1].slice(1, -1).trim()}${quote}`,
    ]);
  }
  rule.params = replace(value, replacements);
}

/**
 * @param {import('postcss').Declaration} decl
 * @return {void}
 */
function transformDecl(decl) {
  const value =
    decl.raws.value?.value === decl.value
      ? (decl.raws.value.raw ?? decl.value)
      : decl.value;
  /** @type {[number, number, string][]} */ const replacements = [];
  forEachUrl(value, (start, end, input, quote, name) => {
    let url = input.trim().replace(multiline, '');
    if (!url) {
      replacements.push([start, end, `${name}()`]);
      return;
    }
    if (dataUrlRegex.test(url)) return;
    if (!extensionRegex.test(url)) url = convert(url);

    let outputQuote = quote;
    const escaped = url.replace(escapeChars, '\\$1');
    if (escaped !== url) {
      if (escaped.length < url.length + 2) {
        url = escaped;
        outputQuote = '';
      } else if (!quote) {
        url = escaped;
      }
    } else {
      outputQuote = '';
    }
    replacements.push([
      start,
      end,
      `${name}(${outputQuote}${url}${outputQuote})`,
    ]);
  });
  assignValue(decl, replace(value, replacements));
}

/** @param {import('postcss').Declaration} decl @param {string} value */
function assignValue(decl, value) {
  decl.value = value;
  if (decl.raws.value?.raw) decl.raws.value = { raw: value, value };
}

/**
 * Visit complete `url()` ranges without interpreting their opaque spelling.
 * @param {string} value
 * @param {(start: number, end: number, raw: string, quote: string, name: string) => void} callback
 * @param {CSSToken[]} [tokens]
 */
function forEachUrl(value, callback, tokens = [...tokenize({ css: value })]) {
  /** @type {number[]} */ const stack = [];
  /** @type {Map<number, number>} */ const functionEnds = new Map();
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token[0] === TokenType.Function) stack.push(index);
    else if (token[0] === TokenType.CloseParen) {
      const start = stack.pop();
      if (start !== undefined) functionEnds.set(start, index);
    }
  }
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token[0] === TokenType.URL) {
      const raw = token[4].value;
      callback(
        token[2],
        token[3] + 1,
        raw,
        '',
        token[1].slice(0, token[1].indexOf('('))
      );
      continue;
    }
    if (
      token[0] !== TokenType.Function ||
      token[4].value.toLowerCase() !== 'url'
    )
      continue;
    const close = functionEnds.get(index);
    if (close === undefined) continue;
    const content = tokens.slice(index + 1, close);
    const significant = content.filter(
      (child) => child[0] !== TokenType.Whitespace
    );
    if (significant.length === 1 && significant[0][0] === TokenType.String) {
      const string = significant[0];
      callback(
        token[2],
        tokens[close][3] + 1,
        string[1].endsWith(string[1][0])
          ? string[1].slice(1, -1)
          : string[4].value,
        string[1][0],
        token[1].slice(0, -1)
      );
    } else if (
      !significant.length ||
      !significant.some((child) => child[0] === TokenType.Function)
    ) {
      callback(
        token[2],
        tokens[close][3] + 1,
        value.slice(token[2] + token[1].length, tokens[close][2]),
        '',
        token[1].slice(0, -1)
      );
    }
    index = close;
  }
}

/** @param {string} value @param {[number, number, string][]} replacements */
function replace(value, replacements) {
  let result = value;
  for (const [start, end, output] of replacements.toSorted(
    (a, b) => b[0] - a[0]
  )) {
    result = result.slice(0, start) + output + result.slice(end);
  }
  return result;
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-url',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      css.walk((node) => {
        if (node.type === 'decl') {
          return transformDecl(node);
        } else if (
          node.type === 'atrule' &&
          node.name.toLowerCase() === 'namespace'
        ) {
          return transformNamespace(node);
        }
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

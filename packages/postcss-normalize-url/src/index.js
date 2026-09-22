import path from '#path';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import normalize from './normalize.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const multiline = /\\(?:\r\n|[\r\n])/gv;
const { asciiLowerCase } = cssnanoUtils;
// eslint-disable-next-line no-useless-escape
const urlTokenEscapeChars = /[\\ \t\n\r\f\(\)"']/gv;
const singleQuoteStringEscapeChars = /[\\\n\r\f']/gv;
const doubleQuoteStringEscapeChars = /[\\\n\r\f"]/gv;

/**
 * @param {string} value
 * @return {boolean}
 */
function isClosedString(value) {
  if (value.length < 2 || !['"', "'"].includes(value[0])) return false;

  let backslashes = 0;
  for (
    let index = value.length - 2;
    index >= 0 && value[index] === '\\';
    index--
  ) {
    backslashes++;
  }

  return value.at(-1) === value[0] && backslashes % 2 === 0;
}

// Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
// Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/v;
// Windows paths like `c:\`
const WINDOWS_PATH_REGEX = /^[a-zA-Z]:\\/v;
const dataUrlRegex = /^[dD][aA][tT][aA]:/v;

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

  // Normalize against POSIX separators only: in a CSS url() a `\` is a literal
  // character, not a path separator, so it must survive on every platform.
  return path.posix.normalize(url);
}

/**
 * Escape characters that terminate or invalidate an unquoted CSS url() token.
 * @param {string} value
 * @return {string}
 */
function escapeForUrlToken(value) {
  return value.replace(urlTokenEscapeChars, (match) => {
    switch (match) {
      case '\n':
        return '\\a ';
      case '\r':
        return '\\d ';
      case '\f':
        return '\\c ';
      default:
        return '\\' + match;
    }
  });
}

/**
 * Escape characters for a CSS string token in the given quote context.
 * @param {string} value
 * @param {string} quote
 * @return {string}
 */
function escapeForString(value, quote) {
  const pattern =
    quote === "'" ? singleQuoteStringEscapeChars : doubleQuoteStringEscapeChars;
  return value.replace(pattern, (match) => {
    switch (match) {
      case '\n':
        return '\\a ';
      case '\r':
        return '\\d ';
      case '\f':
        return '\\c ';
      default:
        return '\\' + match;
    }
  });
}

/**
 * @param {import('postcss').AtRule} rule
 * @return {void}
 */
function transformNamespace(rule) {
  const value = rule.params;
  /** @type {CSSToken[]} */ const tokens = [...tokenize({ css: value })];
  /** @type {[number, number, string][]} */ const replacements = [];
  /** @type {[number, number][]} */ const urlRanges = [];
  forEachUrl(
    value,
    (start, end, decoded) => {
      urlRanges.push([start, end]);
      replacements.push([
        start,
        end,
        `"${escapeForString(decoded.trim(), '"')}"`,
      ]);
    },
    tokens
  );
  for (const token of tokens) {
    if (token[0] !== TokenType.String) continue;
    if (!isClosedString(token[1])) continue;
    // Strings inside a url() were already rewritten by forEachUrl; overlapping
    // replacements would be applied against shifted indices and corrupt output.
    if (
      urlRanges.some(([start, end]) => token[2] >= start && token[3] + 1 <= end)
    )
      continue;
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
  forEachUrl(value, (start, end, decoded, quote, name) => {
    let url = decoded.trim();
    if (!url) {
      replacements.push([start, end, `${name}()`]);
      return;
    }
    if (dataUrlRegex.test(url)) return;
    url = convert(url);

    let outputQuote = quote;
    if (quote) {
      const unquoted = escapeForUrlToken(url);
      const quoted = escapeForString(url, quote);
      if (unquoted.length < quoted.length + 2) {
        url = unquoted;
        outputQuote = '';
      } else {
        url = quoted;
      }
    } else {
      url = escapeForUrlToken(url);
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
 * Visit complete `url()` ranges with their decoded string or URL value.
 * @param {string} value
 * @param {(start: number, end: number, decoded: string, quote: string, name: string) => void} callback
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
      const decoded = token[4].value;
      callback(
        token[2],
        token[3] + 1,
        decoded,
        '',
        token[1].slice(0, token[1].indexOf('('))
      );
      continue;
    }
    if (
      token[0] !== TokenType.Function ||
      asciiLowerCase(token[4].value) !== 'url'
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
      if (!isClosedString(string[1])) {
        index = close;
        continue;
      }
      // Like unquoted url tokens, hand the caller the decoded string value so
      // escaping operates on the URL's semantic value, not its raw spelling.
      callback(
        token[2],
        tokens[close][3] + 1,
        string[4].value,
        string[1][0],
        token[1].slice(0, -1)
      );
    } else if (
      !significant.length ||
      !significant.some(
        (child) =>
          child[0] === TokenType.Function ||
          child[0] === TokenType.String ||
          child[0] === TokenType.BadString
      )
    ) {
      callback(
        token[2],
        tokens[close][3] + 1,
        value
          .slice(token[2] + token[1].length, tokens[close][2])
          .replace(multiline, ''),
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
          asciiLowerCase(node.name) === 'namespace'
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

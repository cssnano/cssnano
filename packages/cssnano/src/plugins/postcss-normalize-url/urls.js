import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { escapeForUrlToken, replaceEscapeChar } from '../../values/escapes.js';
import {
  closeParen,
  func,
  stringToken,
  url as urlToken,
} from '../../values/tokenConstructors.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { asciiLowerCase, isCSSWhitespace } = cssnanoUtils;

const singleQuoteStringEscapeChars = /[\\\n\r\f']/gv;
const doubleQuoteStringEscapeChars = /[\\\n\r\f"]/gv;

const dataUrlRegex = /^[dD][aA][tT][aA]:/v;
// Non-printable code points are a parse error in an unquoted <url-token>
// (CSS Syntax 3 §4.3.6); URLs containing them keep their quotes. The
// control-character match below is intentional.
// oxlint-disable-next-line no-control-regex
const nonPrintableRegex = /[\u0000-\u0008\u000B\u000E-\u001F\u007F]/v;

/**
 * Escape characters for a CSS string token in the given quote context.
 * @param {string} value
 * @param {string} quote
 * @return {string}
 */
export function escapeForString(value, quote) {
  const pattern =
    quote === "'" ? singleQuoteStringEscapeChars : doubleQuoteStringEscapeChars;
  return value.replace(pattern, replaceEscapeChar);
}

/**
 * Trim CSS whitespace only; String.prototype.trim also removes characters
 * such as U+00A0 that are part of the URL.
 * @param {string} value
 * @return {string}
 */
function trimCSSWhitespace(value) {
  let start = 0;
  let end = value.length;
  while (start < end && isCSSWhitespace(value.charCodeAt(start))) start++;
  while (end > start && isCSSWhitespace(value.charCodeAt(end - 1))) end--;
  return value.slice(start, end);
}

/**
 * The function name a url or src token was written with, such as `URL`, or
 * an empty string when there is no function token.
 * @param {CSSToken | undefined} nameToken a URL token or a function token
 * @return {string}
 */
function functionName(nameToken) {
  if (nameToken === undefined) return '';
  const text = nameToken[1];
  return text.slice(0, text.indexOf('('));
}

/**
 * A string token in the function form, `name("…")`, or on its own when there
 * is no name.
 * @param {CSSToken | undefined} nameToken the function token, when there is one
 * @param {CSSToken} string
 * @return {CSSToken[]}
 */
function wrapString(nameToken, string) {
  if (nameToken === undefined) return [string];
  // A URL token spells the whole url(); the function form opens with its name.
  const head =
    nameToken[0] === TokenType.Function
      ? nameToken
      : func(functionName(nameToken));
  return [head, string, closeParen()];
}

/**
 * Normalize and format a url() or src() token value (unquoted or quoted).
 * Returns undefined when the URL is a data URL. It keeps the URL itself
 * byte-identical, because dot segments, duplicate slashes, host name dots and
 * percent-escapes are not guaranteed equivalent for every server or bundler.
 * @param {string} decoded
 * @param {string} quote
 * @param {CSSToken | undefined} nameToken the URL or function token, or
 *   undefined for a bare string
 * @return {CSSToken[] | undefined}
 */
export function normalizeUrlTokenValue(decoded, quote, nameToken) {
  const url = trimCSSWhitespace(decoded);
  const name = functionName(nameToken);
  const lowerName = asciiLowerCase(name);
  if (!url) {
    if (nameToken === undefined) return undefined;
    if (lowerName === 'src') {
      return wrapString(nameToken, stringToken('""', ''));
    }
    return [urlToken('', name)];
  }
  if (dataUrlRegex.test(url)) return undefined;

  // When name is empty (string with modifiers), or src() function,
  // quotes must be retained and unquoting is not allowed.
  if (nameToken === undefined || lowerName === 'src') {
    const outputQuote = quote || '"';
    const string = stringToken(
      `${outputQuote}${escapeForString(url, outputQuote)}${outputQuote}`,
      url
    );
    return wrapString(nameToken, string);
  }

  if (nonPrintableRegex.test(url)) {
    // Non-printable characters are a parse error in unquoted url tokens
    // (CSS Syntax 3 §4.3.6), so quoted string syntax must be used.
    const outputQuote = quote || '"';
    const string = stringToken(
      `${outputQuote}${escapeForString(url, outputQuote)}${outputQuote}`,
      url
    );
    return wrapString(nameToken, string);
  }
  if (quote) {
    const unquoted = escapeForUrlToken(url);
    const quoted = escapeForString(url, quote);
    if (unquoted.length >= quoted.length + 2) {
      const string = stringToken(`${quote}${quoted}${quote}`, url);
      return wrapString(nameToken, string);
    }
  }
  return [urlToken(url, name)];
}

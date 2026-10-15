import cssnanoUtils from '#utils';

const { asciiLowerCase } = cssnanoUtils;

const cssWhitespace = new Set([' ', '\t', '\n', '\r', '\f']);
// eslint-disable-next-line no-useless-escape
const urlTokenEscapeChars = /[\\ \t\n\r\f\(\)"']/gv;
const singleQuoteStringEscapeChars = /[\\\n\r\f']/gv;
const doubleQuoteStringEscapeChars = /[\\\n\r\f"]/gv;

const dataUrlRegex = /^[dD][aA][tT][aA]:/v;
// Non-printable code points are a parse error in an unquoted <url-token>
// (CSS Syntax 3 §4.3.6); URLs containing them keep their quotes. The
// control-character match below is intentional.
// oxlint-disable-next-line no-control-regex
const nonPrintableRegex = /[\u0000-\u0008\u000B\u000E-\u001F\u007F]/v;

/**
 * @param {string} match
 * @return {string}
 */
function replaceEscapeChar(match) {
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
}

/**
 * Escape characters that terminate or invalidate an unquoted CSS url() token.
 * @param {string} value
 * @return {string}
 */
function escapeForUrlToken(value) {
  return value.replace(urlTokenEscapeChars, replaceEscapeChar);
}

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
  while (start < end && cssWhitespace.has(value[start])) start++;
  while (end > start && cssWhitespace.has(value[end - 1])) end--;
  return value.slice(start, end);
}

/**
 * Normalize and format a url() or src() token value (unquoted or quoted).
 * Returns undefined when the URL is a data URL. It keeps the URL itself
 * byte-identical, because dot segments, duplicate slashes, host name dots and
 * percent-escapes are not guaranteed equivalent for every server or bundler.
 * @param {string} decoded
 * @param {string} quote
 * @param {string} name
 * @return {string | undefined}
 */
export function normalizeUrlTokenValue(decoded, quote, name) {
  let url = trimCSSWhitespace(decoded);
  const lowerName = asciiLowerCase(name);
  if (!url) {
    if (!name) return undefined;
    return lowerName === 'src' ? `${name}("")` : `${name}()`;
  }
  if (dataUrlRegex.test(url)) return undefined;

  // When name is empty (string with modifiers), or src() function,
  // quotes must be retained and unquoting is not allowed.
  if (!name || lowerName === 'src') {
    const outputQuote = quote || '"';
    url = escapeForString(url, outputQuote);
    return name
      ? `${name}(${outputQuote}${url}${outputQuote})`
      : `${outputQuote}${url}${outputQuote}`;
  }

  let outputQuote = quote;
  if (nonPrintableRegex.test(url)) {
    // Non-printable characters are a parse error in unquoted url tokens
    // (CSS Syntax 3 §4.3.6), so quoted string syntax must be used.
    outputQuote = quote || '"';
    url = escapeForString(url, outputQuote);
  } else if (quote) {
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
  return `${name}(${outputQuote}${url}${outputQuote})`;
}

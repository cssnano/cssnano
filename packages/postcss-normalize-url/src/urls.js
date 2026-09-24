import cssnanoUtils from 'cssnano-utils';
import normalize, { unreservedRegex } from './normalize.js';

const { asciiLowerCase } = cssnanoUtils;

// eslint-disable-next-line no-useless-escape
const urlTokenEscapeChars = /[\\ \t\n\r\f\(\)"']/gv;
const singleQuoteStringEscapeChars = /[\\\n\r\f']/gv;
const doubleQuoteStringEscapeChars = /[\\\n\r\f"]/gv;

// Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
// Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/v;
// Windows drive letter paths like `c:\` or `c:/`
const WINDOWS_PATH_REGEX = /^[a-zA-Z]:[\\\/]/v;
const WINDOWS_DRIVE_REGEX = /^[a-zA-Z]:$/v;
const TRAILING_SEGMENTS = new Set(['', '.', '..']);
export const dataUrlRegex = /^[dD][aA][tT][aA]:/v;
// Non-printable code points are a parse error in an unquoted <url-token>
// (CSS Syntax 3 §4.3.6); URLs containing them keep their quotes. The
// control-character match below is intentional.
// oxlint-disable-next-line no-control-regex
const nonPrintableRegex = /[\u0000-\u0008\u000B\u000E-\u001F\u007F]/v;

/**
 * @param {string[]} output
 * @param {string} last
 * @param {boolean} isDriveRoot
 * @return {boolean}
 */
function shouldKeepTrailingSlash(output, last, isDriveRoot) {
  if (isDriveRoot && output.length === 1) return true;
  if (output.length > 0 && output[output.length - 1] === '..') {
    return last === '';
  }
  return TRAILING_SEGMENTS.has(last);
}

/**
 * @param {string[]} output
 * @param {boolean} allowExcess
 * @param {number} rootLimit
 * @return {void}
 */
function handleParentSegment(output, allowExcess, rootLimit) {
  if (output.length > rootLimit && output[output.length - 1] !== '..') {
    output.pop();
  } else if (allowExcess) {
    output.push('..');
  }
}

/**
 * Remove `.` and `..` dot segments from a URL path (RFC 3986 §5.2.4).
 * A CSS url() has no base URL to resolve against, so excess `..` segments
 * are kept instead of being discarded.
 * @param {string} path
 * @return {string}
 */
function removeDotSegments(path) {
  if (!path) return '';
  const absolute = path.startsWith('/');
  const segments = path.split('/');
  const isDriveRoot =
    segments.length > 0 && WINDOWS_DRIVE_REGEX.test(segments[0]);
  const rootLimit = isDriveRoot ? 1 : 0;
  const last = segments[segments.length - 1];
  const output = [];
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      handleParentSegment(output, !absolute && !isDriveRoot, rootLimit);
      continue;
    }
    output.push(segment.replace(unreservedRegex, decodeURIComponent));
  }
  if (output.length === 0) {
    if (absolute) return '/';
    return last === '' ? './' : '.';
  }
  const trailing = shouldKeepTrailingSlash(output, last, isDriveRoot);
  let result = (absolute ? '/' : '') + output.join('/');
  if (trailing && !result.endsWith('/')) result += '/';
  if (
    !absolute &&
    !isDriveRoot &&
    output.length > 0 &&
    ABSOLUTE_URL_REGEX.test(output[0])
  ) {
    result = './' + result;
  }
  return result;
}

/**
 * Normalize the path component of a relative URL. Query and fragment
 * components are split off first: `?` and `#` are URL component delimiters
 * (RFC 3986 §3.4, §3.5), not filename characters for dot-segment removal.
 * @param {string} url
 * @return {string}
 */
function normalizeRelativeUrl(url) {
  const delimiter = url.search(/[?#]/v);
  if (delimiter === -1) return removeDotSegments(url);
  return removeDotSegments(url.slice(0, delimiter)) + url.slice(delimiter);
}

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
export function convert(url) {
  if (isAbsolute(url) || url.startsWith('//')) {
    return normalize(url);
  }

  // Normalize the path component only: a `\` is a literal character in a
  // CSS url(), not a path separator, and is preserved on every platform.
  return normalizeRelativeUrl(url);
}

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
export function escapeForUrlToken(value) {
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
 * Normalize and format a url() or src() token value (unquoted or quoted).
 * Returns undefined when the URL is a data URL.
 * @param {string} decoded
 * @param {string} quote
 * @param {string} name
 * @return {string | undefined}
 */
export function normalizeUrlTokenValue(decoded, quote, name) {
  let url = decoded.trim();
  const lowerName = asciiLowerCase(name);
  if (!url) {
    if (!name) return undefined;
    return lowerName === 'src' ? `${name}("")` : `${name}()`;
  }
  if (dataUrlRegex.test(url)) return undefined;
  url = convert(url);

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

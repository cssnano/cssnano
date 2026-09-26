import { tokenize, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import normalize, { unreservedRegex } from './normalize.js';

/** @import {CSSToken, TokenString} from '@csstools/css-tokenizer' */

const { applyEdits, asciiLowerCase } = cssnanoUtils;
// eslint-disable-next-line no-useless-escape
const urlTokenEscapeChars = /[\\ \t\n\r\f\(\)"']/gv;
const singleQuoteStringEscapeChars = /[\\\n\r\f']/gv;
const doubleQuoteStringEscapeChars = /[\\\n\r\f"]/gv;

/**
 * @param {string} value
 * @return {boolean}
 */
function isClosedString(value) {
  if (value.length < 2) return false;
  const quote = value[0];
  if (quote !== '"' && quote !== "'") return false;

  let backslashes = 0;
  for (
    let index = value.length - 2;
    index >= 0 && value[index] === '\\';
    index--
  ) {
    backslashes++;
  }

  return value[value.length - 1] === quote && backslashes % 2 === 0;
}

// Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
// Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/v;
// Windows drive letter paths like `c:\` or `c:/`
const WINDOWS_PATH_REGEX = /^[a-zA-Z]:[\\\/]/v;
const WINDOWS_DRIVE_REGEX = /^[a-zA-Z]:$/v;
const URL_CANDIDATE_REGEX = /(?:url|src|\\)/iv;
const TRAILING_SEGMENTS = new Set(['', '.', '..']);
const dataUrlRegex = /^[dD][aA][tT][aA]:/v;
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
function convert(url) {
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
function escapeForUrlToken(value) {
  return value.replace(urlTokenEscapeChars, replaceEscapeChar);
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
  return value.replace(pattern, replaceEscapeChar);
}

/**
 * Find the close paren matching the function token at `index`. Tracks bare
 * parentheses as well as functions, so a nested `(` does not close an outer
 * function. Returns -1 when the function is unterminated.
 * @param {CSSToken[]} tokens
 * @param {number} index
 * @return {number}
 */
function findFunctionEnd(tokens, index) {
  let depth = 0;
  for (let scan = index; scan < tokens.length; scan++) {
    const type = tokens[scan][0];
    if (type === TokenType.Function || type === TokenType.OpenParen) depth++;
    else if (type === TokenType.CloseParen && --depth === 0) return scan;
  }
  return -1;
}

/**
 * Inspect contents of a url() or src() function token.
 * @param {CSSToken[]} tokens
 * @param {number} index
 * @param {number} close
 * @return {{ stringToken?: TokenString, hasModifiers: boolean, hasComment: boolean }}
 */
function scanFunction(tokens, index, close) {
  /** @type {TokenString | undefined} */
  let stringToken;
  let hasModifiers = false;
  let hasComment = false;
  for (let i = index + 1; i < close; i++) {
    const type = tokens[i][0];
    if (type === TokenType.Whitespace) continue;
    if (type === TokenType.Comment) {
      hasComment = true;
      break;
    }
    if (!stringToken) {
      if (type === TokenType.String && isClosedString(tokens[i][1])) {
        stringToken = /** @type {TokenString} */ (tokens[i]);
      } else {
        break;
      }
    } else {
      hasModifiers = true;
      break;
    }
  }
  return { stringToken, hasModifiers, hasComment };
}

/**
 * Extract and callback import target, returning the next token index and validity.
 * @param {CSSToken[]} tokens
 * @param {number} index
 * @param {(start: number, end: number, decoded: string, quote: string, name: string, isTarget?: boolean) => void} callback
 * @return {{ nextIndex: number, valid: boolean }}
 */
function processImportTarget(tokens, index, callback) {
  const token = tokens[index];
  const type = token[0];
  if (type === TokenType.String && isClosedString(token[1])) {
    callback(token[2], token[3] + 1, token[4].value, token[1][0], '', true);
    return { nextIndex: index, valid: true };
  }
  if (type === TokenType.URL) {
    callback(
      token[2],
      token[3] + 1,
      token[4].value,
      '',
      token[1].slice(0, token[1].indexOf('(')),
      true
    );
    return { nextIndex: index, valid: true };
  }
  if (type === TokenType.Function && asciiLowerCase(token[4].value) === 'url') {
    const close = findFunctionEnd(tokens, index);
    if (close !== -1) {
      const { stringToken, hasModifiers, hasComment } = scanFunction(
        tokens,
        index,
        close
      );
      if (stringToken && !hasModifiers && !hasComment) {
        callback(
          token[2],
          tokens[close][3] + 1,
          stringToken[4].value,
          stringToken[1][0],
          token[1].slice(0, -1),
          true
        );
        return { nextIndex: close, valid: true };
      }
    }
  }
  return { nextIndex: index, valid: false };
}

/**
 * @param {CSSToken[]} tokens
 * @param {number} index
 * @param {(start: number, end: number, decoded: string, quote: string, name: string, isTarget?: boolean) => void} callback
 * @return {number} close index or -1
 */
function processFunctionToken(tokens, index, callback) {
  const close = findFunctionEnd(tokens, index);
  if (close === -1) return -1;

  const { stringToken, hasModifiers, hasComment } = scanFunction(
    tokens,
    index,
    close
  );
  if (stringToken && !hasComment) {
    if (hasModifiers) {
      callback(
        stringToken[2],
        stringToken[3] + 1,
        stringToken[4].value,
        stringToken[1][0],
        ''
      );
    } else {
      callback(
        tokens[index][2],
        tokens[close][3] + 1,
        stringToken[4].value,
        stringToken[1][0],
        tokens[index][1].slice(0, -1)
      );
    }
  }

  return close;
}

/**
 * Visit complete url() and src() ranges, top-level strings, or modifier string tokens.
 * @param {string} value
 * @param {(start: number, end: number, decoded: string, quote: string, name: string, isTarget?: boolean) => void} callback
 * @param {{ includeStrings?: boolean, isImport?: boolean }} [options]
 * @return {void}
 */
function forEachUrl(value, callback, options = {}) {
  const { includeStrings = false, isImport = false } = options;
  const tokens = [...tokenize({ css: value })];
  let targetProcessed = false;

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const type = token[0];

    if (isImport && !targetProcessed) {
      if (type === TokenType.Whitespace || type === TokenType.Comment) {
        continue;
      }
      const result = processImportTarget(tokens, index, callback);
      if (!result.valid) return;
      targetProcessed = true;
      index = result.nextIndex;
      continue;
    }

    if (type === TokenType.URL) {
      callback(
        token[2],
        token[3] + 1,
        token[4].value,
        '',
        token[1].slice(0, token[1].indexOf('('))
      );
      continue;
    }

    if (
      includeStrings &&
      type === TokenType.String &&
      isClosedString(token[1])
    ) {
      callback(token[2], token[3] + 1, token[4].value, token[1][0], '');
      continue;
    }

    if (type !== TokenType.Function) continue;

    const funcName = asciiLowerCase(token[4].value);
    if (funcName !== 'url' && funcName !== 'src') continue;

    const close = processFunctionToken(tokens, index, callback);
    if (close === -1) break;
    index = close;
  }
}

/**
 * Synchronize node value or params with PostCSS raw metadata.
 * @param {import('postcss').Declaration | import('postcss').AtRule} node
 * @param {'value' | 'params'} prop
 * @param {(currentValue: string) => string | undefined} updater
 * @return {void}
 */
function updateNodeValue(node, prop, updater) {
  const target = /** @type {Record<string, any>} */ (
    /** @type {unknown} */ (node)
  );
  const raws = target.raws?.[prop];
  const value =
    raws?.value === target[prop] ? (raws.raw ?? target[prop]) : target[prop];
  const updated = updater(value);
  if (updated !== undefined && updated !== value) {
    target[prop] = updated;
    if (raws?.raw) {
      target.raws[prop] = { raw: updated, value: updated };
    }
  }
}

/**
 * Normalize and format a url() or src() token value (unquoted or quoted).
 * Returns undefined when the URL is a data URL.
 * @param {string} decoded
 * @param {string} quote
 * @param {string} name
 * @return {string | undefined}
 */
function normalizeUrlTokenValue(decoded, quote, name) {
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

/**
 * @param {import('postcss').Declaration | import('postcss').AtRule} node
 * @param {'value' | 'params'} prop
 * @return {void}
 */
function transformNodeUrls(node, prop) {
  const current = /** @type {Record<string, any>} */ (
    /** @type {unknown} */ (node)
  )[prop];
  if (!URL_CANDIDATE_REGEX.test(current)) return;

  updateNodeValue(node, prop, (value) => {
    /** @type {{start: number, end: number, text: string}[]} */
    const edits = [];
    forEachUrl(value, (start, end, decoded, quote, name) => {
      const text = normalizeUrlTokenValue(decoded, quote, name);
      if (text !== undefined && text !== value.slice(start, end)) {
        edits.push({ start, end, text });
      }
    });
    return edits.length > 0 ? applyEdits(value, edits) : undefined;
  });
}

/**
 * @param {import('postcss').AtRule} rule
 * @return {void}
 */
function transformNamespace(rule) {
  updateNodeValue(rule, 'params', (value) => {
    /** @type {{start: number, end: number, text: string}[]} */
    const edits = [];
    forEachUrl(
      value,
      (start, end, decoded, quote, name) => {
        const trimmed = decoded.trim();
        const text = name
          ? `"${escapeForString(trimmed, '"')}"`
          : `${quote}${escapeForString(trimmed, quote)}${quote}`;
        if (text !== value.slice(start, end)) {
          edits.push({ start, end, text });
        }
      },
      { includeStrings: true }
    );
    return edits.length > 0 ? applyEdits(value, edits) : undefined;
  });
}

/**
 * Normalize the first url or string import source in import at-rules (CSS Cascading 4 §2),
 * and normalize any inner url() expressions inside conditions.
 * @param {import('postcss').AtRule} rule
 * @return {void}
 */
function transformImport(rule) {
  updateNodeValue(rule, 'params', (value) => {
    /** @type {{start: number, end: number, text: string}[]} */
    const edits = [];
    forEachUrl(
      value,
      (start, end, decoded, quote, name, isTarget) => {
        if (isTarget) {
          const trimmed = decoded.trim();
          if (!trimmed || dataUrlRegex.test(trimmed)) return;
          const url = convert(trimmed);
          const outputQuote = quote || '"';
          const text = `${outputQuote}${escapeForString(url, outputQuote)}${outputQuote}`;
          if (text !== value.slice(start, end)) {
            edits.push({ start, end, text });
          }
        } else {
          const text = normalizeUrlTokenValue(decoded, quote, name);
          if (text !== undefined && text !== value.slice(start, end)) {
            edits.push({ start, end, text });
          }
        }
      },
      { isImport: true }
    );
    return edits.length > 0 ? applyEdits(value, edits) : undefined;
  });
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
          transformNodeUrls(node, 'value');
        } else if (node.type === 'atrule') {
          const name = asciiLowerCase(node.name);
          if (name === 'import') {
            transformImport(node);
          } else if (name === 'namespace') {
            transformNamespace(node);
          } else if (name === 'supports') {
            transformNodeUrls(node, 'params');
          }
        }
      });
    },
  };
}

/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

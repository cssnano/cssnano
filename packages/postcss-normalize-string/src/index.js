import { tokenize, TokenType } from '@csstools/css-tokenizer';

const SINGLE_QUOTE = "'".charCodeAt(0);
const DOUBLE_QUOTE = '"'.charCodeAt(0);
const BACKSLASH = '\\'.charCodeAt(0);
const NEWLINE = '\n'.charCodeAt(0);
const FEED = '\f'.charCodeAt(0);
const CR = '\r'.charCodeAt(0);
const SPACE = ' '.charCodeAt(0);
const TAB = '\t'.charCodeAt(0);

/**
 * @param {number} code
 * @return {boolean}
 */
function isHexDigit(code) {
  return (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x46) ||
    (code >= 0x61 && code <= 0x66)
  );
}

/**
 * Return the index just past the hex digits of the escape whose backslash is at `pos`.
 * CSS Syntax 3 allows one to six hex digits.
 *
 * @param {string} inner
 * @param {number} pos
 * @return {number}
 */
function getHexDigitsEnd(inner, pos) {
  const limit = Math.min(pos + 7, inner.length);
  let end = pos + 2;
  while (end < limit && isHexDigit(inner.charCodeAt(end))) {
    end++;
  }
  return end;
}

/**
 * Return the length of the whitespace at `pos` (CRLF counts as one newline), or 0.
 *
 * @param {string} inner
 * @param {number} pos
 * @return {number}
 */
function getWhitespaceLength(inner, pos) {
  const code = inner.charCodeAt(pos);
  if (code === CR) {
    return inner.charCodeAt(pos + 1) === NEWLINE ? 2 : 1;
  }
  return code === SPACE || code === TAB || code === NEWLINE || code === FEED
    ? 1
    : 0;
}

/**
 * Return the space that keeps an open hex escape from absorbing the code point at `pos`.
 *
 * @param {string} inner
 * @param {number} pos
 * @param {boolean} acceptsMoreDigits
 * @return {string}
 */
function getHexEscapeDelimiter(inner, pos, acceptsMoreDigits) {
  return getWhitespaceLength(inner, pos) > 0 ||
    (acceptsMoreDigits && isHexDigit(inner.charCodeAt(pos)))
    ? ' '
    : '';
}

/**
 * Verify whether a string token has matching delimiters and balanced trailing escapes.
 *
 * @param {string} value
 * @return {boolean}
 */
function isClosedString(value) {
  const len = value.length;
  if (len < 2 || value.charCodeAt(len - 1) !== value.charCodeAt(0)) {
    return false;
  }

  let backslashes = 0;
  for (
    let index = len - 2;
    index >= 0 && value.charCodeAt(index) === BACKSLASH;
    index--
  ) {
    backslashes++;
  }

  return backslashes % 2 === 0;
}

/**
 * Return the length of an escaped line continuation, or 0 if not a newline escape.
 *
 * @param {string} inner
 * @param {number} pos
 * @param {number} len
 * @return {number}
 */
function getEscapedNewlineLength(inner, pos, len) {
  const next = inner.charCodeAt(pos + 1);
  if (next === NEWLINE || next === FEED) {
    return 2;
  }
  if (next === CR) {
    return pos + 2 < len && inner.charCodeAt(pos + 2) === NEWLINE ? 3 : 2;
  }
  return 0;
}

/**
 * Scan string contents to count quotes and detect escaped newlines or redundant escapes.
 *
 * @param {string} inner
 * @param {string} currentQuote
 * @return {{ singleCount: number, doubleCount: number, hasEscapedNewline: boolean, hasRedundantEscape: boolean }}
 */
function scanQuotes(inner, currentQuote) {
  const len = inner.length;
  let singleCount = 0;
  let doubleCount = 0;
  let hasEscapedNewline = false;
  let hasRedundantEscape = false;
  let pos = 0;

  while (pos < len) {
    const code = inner.charCodeAt(pos);
    if (code !== BACKSLASH) {
      if (code === SINGLE_QUOTE) {
        singleCount++;
      } else if (code === DOUBLE_QUOTE) {
        doubleCount++;
      }
      pos++;
      continue;
    }
    const newlineLen = getEscapedNewlineLength(inner, pos, len);
    if (newlineLen > 0) {
      hasEscapedNewline = true;
      pos += newlineLen;
      continue;
    }
    const next = inner.charCodeAt(pos + 1);
    if (next === SINGLE_QUOTE) {
      singleCount++;
      hasRedundantEscape ||= currentQuote === '"';
    } else if (next === DOUBLE_QUOTE) {
      doubleCount++;
      hasRedundantEscape ||= currentQuote === "'";
    }
    pos += 2;
  }

  return { singleCount, doubleCount, hasEscapedNewline, hasRedundantEscape };
}

/**
 * Determine the optimal wrapping quote delimiter.
 *
 * @param {number} singleCount
 * @param {number} doubleCount
 * @param {'single' | 'double'} preferredQuote
 * @param {string} currentQuote
 * @return {string}
 */
function selectTargetQuote(
  singleCount,
  doubleCount,
  preferredQuote,
  currentQuote
) {
  if (singleCount > doubleCount) {
    return '"';
  }
  if (doubleCount > singleCount) {
    return "'";
  }
  if (singleCount === 0 && doubleCount === 0) {
    return preferredQuote === 'single' ? "'" : '"';
  }
  return currentQuote;
}

/**
 * Reconstruct string with the target quote, collapsing newlines and updating escapes.
 *
 * @param {string} inner
 * @param {string} targetQuote
 * @return {string}
 */
function reconstructString(inner, targetQuote) {
  const len = inner.length;
  const targetCode = targetQuote.charCodeAt(0);
  const otherQuote = targetQuote === "'" ? '"' : "'";
  const otherCode = otherQuote.charCodeAt(0);
  const escapedTargetQuote = '\\' + targetQuote;
  const chunks = [targetQuote];
  let cursor = 0;
  let pos = 0;
  // A hex escape without a whitespace terminator would absorb a following hex
  // digit or whitespace once the line continuations after it are removed.
  let openHexEnd = -1;
  let openHexIsShort = false;

  while (pos < len) {
    const code = inner.charCodeAt(pos);
    if (code === BACKSLASH) {
      const newlineLen = getEscapedNewlineLength(inner, pos, len);
      if (newlineLen > 0) {
        if (pos > cursor) {
          chunks.push(inner.slice(cursor, pos));
        }
        const followsOpenHex = pos === openHexEnd;
        pos += newlineLen;
        cursor = pos;
        if (followsOpenHex) {
          openHexEnd = pos;
          chunks.push(getHexEscapeDelimiter(inner, pos, openHexIsShort));
        }
        continue;
      }

      const next = inner.charCodeAt(pos + 1);
      if (next === otherCode) {
        if (pos > cursor) {
          chunks.push(inner.slice(cursor, pos));
        }
        chunks.push(otherQuote);
        pos += 2;
        cursor = pos;
        continue;
      }

      if (isHexDigit(next)) {
        const digitsEnd = getHexDigitsEnd(inner, pos);
        const terminatorLen = getWhitespaceLength(inner, digitsEnd);
        if (terminatorLen === 0) {
          openHexEnd = digitsEnd;
          openHexIsShort = digitsEnd - pos < 7;
        }
        pos = digitsEnd + terminatorLen;
        continue;
      }

      pos += 2;
      continue;
    }

    if (code === targetCode) {
      if (pos > cursor) {
        chunks.push(inner.slice(cursor, pos));
      }
      chunks.push(escapedTargetQuote);
      pos++;
      cursor = pos;
      continue;
    }

    pos++;
  }

  if (cursor < len) {
    chunks.push(inner.slice(cursor));
  }
  chunks.push(targetQuote);
  return chunks.join('');
}

/**
 * Normalizes quotes and line continuations in a single closed CSS string token.
 *
 * @param {string} raw
 * @param {'single' | 'double'} preferredQuote
 * @return {string}
 */
function normalizeString(raw, preferredQuote) {
  const currentQuote = raw[0];
  const targetDelimiter = preferredQuote === 'single' ? "'" : '"';
  const inner = raw.slice(1, -1);

  if (currentQuote === targetDelimiter && !inner.includes('\\')) {
    return raw;
  }

  const { singleCount, doubleCount, hasEscapedNewline, hasRedundantEscape } =
    scanQuotes(inner, currentQuote);

  const targetQuote = selectTargetQuote(
    singleCount,
    doubleCount,
    preferredQuote,
    currentQuote
  );

  if (
    targetQuote === currentQuote &&
    !hasEscapedNewline &&
    !hasRedundantEscape
  ) {
    return raw;
  }

  return reconstructString(inner, targetQuote);
}

/**
 * @param {string} value
 * @param {'single' | 'double'} preferredQuote
 * @return {string}
 */
function normalize(value, preferredQuote) {
  const chunks = [];
  let cursor = 0;
  for (const [type, raw, start, end] of tokenize({ css: value })) {
    if (type !== TokenType.String || !isClosedString(raw)) continue;
    const normalized = normalizeString(raw, preferredQuote);
    if (normalized === raw) continue;
    chunks.push(value.slice(cursor, start), normalized);
    cursor = end + 1;
  }
  if (cursor === 0) return value;
  chunks.push(value.slice(cursor));
  return chunks.join('');
}

/**
 * @param {string} original
 * @param {Map<string, string>} cache
 * @param {'single' | 'double'} preferredQuote
 * @return {string}
 */
function minify(original, cache, preferredQuote) {
  if (!original || (!original.includes("'") && !original.includes('"'))) {
    return original;
  }
  if (cache.has(original)) {
    return /** @type {string} */ (cache.get(original));
  }
  const newValue = normalize(original, preferredQuote);
  cache.set(original, newValue);
  return newValue;
}

/** @param {import('postcss').Declaration} decl @param {string} value */
function assignValue(decl, value) {
  decl.value = value;
  if (decl.raws.value?.raw) decl.raws.value = { raw: value, value };
}

/** @typedef {{preferredQuote?: 'double' | 'single'}} Options */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts) {
  const { preferredQuote = 'double' } = opts ?? {};

  return {
    postcssPlugin: 'postcss-normalize-string',

    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const cache = new Map();

      css.walk((node) => {
        switch (node.type) {
          case 'rule':
            node.selector = minify(node.selector, cache, preferredQuote);
            break;
          case 'decl': {
            const rawValue = node.raws.value;
            const value =
              rawValue?.value === node.value
                ? (rawValue.raw ?? node.value)
                : node.value;
            assignValue(node, minify(value, cache, preferredQuote));
            break;
          }
          case 'atrule':
            if (node.name.toLowerCase() !== 'charset') {
              node.params = minify(node.params, cache, preferredQuote);
            }
            break;
        }
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

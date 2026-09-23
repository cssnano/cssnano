import { tokenize, TokenType } from '@csstools/css-tokenizer';

const SINGLE_QUOTE = "'".charCodeAt(0);
const DOUBLE_QUOTE = '"'.charCodeAt(0);
const BACKSLASH = '\\'.charCodeAt(0);
const NEWLINE = '\n'.charCodeAt(0);
const FEED = '\f'.charCodeAt(0);
const CR = '\r'.charCodeAt(0);

/**
 * Verify whether a string token has matching delimiters and balanced trailing escapes.
 *
 * @param {string} value
 * @return {boolean}
 */
function isClosedString(value) {
  if (value.length < 2 || (value[0] !== "'" && value[0] !== '"')) {
    return false;
  }

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
    if (code === BACKSLASH) {
      if (pos + 1 < len) {
        const newlineLen = getEscapedNewlineLength(inner, pos, len);
        if (newlineLen > 0) {
          hasEscapedNewline = true;
          pos += newlineLen;
          continue;
        }
        const next = inner.charCodeAt(pos + 1);
        if (next === SINGLE_QUOTE) {
          singleCount++;
          if (currentQuote === '"') {
            hasRedundantEscape = true;
          }
          pos += 2;
          continue;
        }
        if (next === DOUBLE_QUOTE) {
          doubleCount++;
          if (currentQuote === "'") {
            hasRedundantEscape = true;
          }
          pos += 2;
          continue;
        }
        pos += 2;
        continue;
      }
      pos++;
      continue;
    }
    if (code === SINGLE_QUOTE) {
      singleCount++;
    } else if (code === DOUBLE_QUOTE) {
      doubleCount++;
    }
    pos++;
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

  while (pos < len) {
    const code = inner.charCodeAt(pos);
    if (code === BACKSLASH) {
      if (pos + 1 < len) {
        const newlineLen = getEscapedNewlineLength(inner, pos, len);
        if (newlineLen > 0) {
          if (pos > cursor) {
            chunks.push(inner.slice(cursor, pos));
          }
          pos += newlineLen;
          cursor = pos;
          continue;
        }
        if (inner.charCodeAt(pos + 1) === otherCode) {
          if (pos > cursor) {
            chunks.push(inner.slice(cursor, pos));
          }
          chunks.push(otherQuote);
          pos += 2;
          cursor = pos;
          continue;
        }
        pos += 2;
        continue;
      }
      pos++;
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
  const inner = raw.slice(1, -1);
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
  if (!value || (!value.includes("'") && !value.includes('"'))) {
    return value;
  }

  const chunks = [];
  let cursor = 0;
  let changed = false;
  for (const [type, raw, start, end] of tokenize({ css: value })) {
    if (type !== TokenType.String) continue;
    if (!isClosedString(raw)) continue;
    const normalized = normalizeString(raw, preferredQuote);
    if (normalized !== raw) {
      changed = true;
    }
    chunks.push(value.slice(cursor, start));
    chunks.push(normalized);
    cursor = end + 1;
  }
  if (!changed) return value;
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
  const key = original + '|' + preferredQuote;
  if (cache.has(key)) {
    return /** @type {string} */ (cache.get(key));
  }
  const newValue = normalize(original, preferredQuote);
  cache.set(key, newValue);
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
  const { preferredQuote } = Object.assign(
    {},
    {
      preferredQuote: 'double',
    },
    opts
  );

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
          case 'decl':
            {
              const value =
                node.raws.value?.value === node.value
                  ? (node.raws.value.raw ?? node.value)
                  : node.value;
              assignValue(node, minify(value, cache, preferredQuote));
            }
            break;
          case 'atrule':
            node.params = minify(node.params, cache, preferredQuote);
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

import { tokenize, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import {
  convert,
  dataUrlRegex,
  escapeForString,
  normalizeUrlTokenValue,
} from './urls.js';

/** @import {CSSToken, TokenString, TokenURL} from '@csstools/css-tokenizer' */

const { applyEdits, asciiLowerCase } = cssnanoUtils;
const URL_CANDIDATE_REGEX = /url|src|\\/iv;

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
 * Forward an unquoted URL token to callback.
 * @param {TokenURL} token
 * @param {(start: number, end: number, decoded: string, quote: string, name: string, isTarget?: boolean) => void} callback
 * @param {boolean} [isTarget]
 * @return {void}
 */
function callbackUrlToken(token, callback, isTarget = false) {
  callback(
    token[2],
    token[3] + 1,
    token[4].value,
    '',
    token[1].slice(0, token[1].indexOf('(')),
    isTarget
  );
}

/**
 * Extracts the target of an import declaration,
 * returning the next token index and validity.
 *
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
    callbackUrlToken(/** @type {TokenURL} */ (token), callback, true);
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
      callbackUrlToken(/** @type {TokenURL} */ (token), callback);
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

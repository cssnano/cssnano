import { tokenize, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { escapeForString, normalizeUrlTokenValue } from './urls.js';

/** @import {CSSToken, TokenString} from '@csstools/css-tokenizer' */
/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */

const { applyEdits, asciiLowerCase } = cssnanoUtils;
const URL_CANDIDATE_REGEX = /url|src|\\/iv;

/**
 * Whether a String token ends with its opening quote, not with an escaped one.
 * The tokenizer only starts a String token at a quote.
 * @param {string} value
 * @return {boolean}
 */
function isClosedString(value) {
  if (value.length < 2) return false;
  const quote = value[0];

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
 * Extracts the target of an import declaration,
 * returning the next token index and validity. The target is reported
 * without a function name, so that it is written as a string.
 *
 * @param {CSSToken[]} tokens
 * @param {number} index
 * @param {(start: number, end: number, decoded: string, quote: string, name: string) => void} callback
 * @return {{ nextIndex: number, valid: boolean }}
 */
function processImportTarget(tokens, index, callback) {
  const token = tokens[index];
  const type = token[0];
  if (type === TokenType.String && isClosedString(token[1])) {
    callback(token[2], token[3] + 1, token[4].value, token[1][0], '');
    return { nextIndex: index, valid: true };
  }
  if (type === TokenType.URL) {
    callback(token[2], token[3] + 1, token[4].value, '', '');
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
          ''
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
 * @param {(start: number, end: number, decoded: string, quote: string, name: string) => void} callback
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
 * @param {(start: number, end: number, decoded: string, quote: string, name: string) => void} callback
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
 * @param {string} value
 * @param {{ isImport?: boolean }} [options]
 * @return {string | undefined}
 */
function normalizeUrls(value, options) {
  /** @type {{start: number, end: number, text: string}[]} */
  const edits = [];
  forEachUrl(
    value,
    (start, end, decoded, quote, name) => {
      const text = normalizeUrlTokenValue(decoded, quote, name);
      if (text !== undefined && text !== value.slice(start, end)) {
        edits.push({ start, end, text });
      }
    },
    options
  );
  return edits.length > 0 ? applyEdits(value, edits) : undefined;
}

/**
 * Normalize the first url or string import source in import at-rules (CSS Cascading 4 §2),
 * and normalize any inner url() expressions inside conditions.
 * @param {string} value
 * @return {string | undefined}
 */
function normalizeImportUrls(value) {
  return normalizeUrls(value, { isImport: true });
}

/**
 * Normalize the url() and string sources of an @namespace prelude. A namespace
 * name is compared literally, so its whitespace is kept.
 * @param {string} value
 * @return {string | undefined}
 */
function normalizeNamespaceUrls(value) {
  /** @type {{start: number, end: number, text: string}[]} */
  const edits = [];
  forEachUrl(
    value,
    (start, end, decoded, quote, name) => {
      const text = name
        ? `"${escapeForString(decoded, '"')}"`
        : `${quote}${escapeForString(decoded, quote)}${quote}`;
      if (text !== value.slice(start, end)) {
        edits.push({ start, end, text });
      }
    },
    { includeStrings: true }
  );
  return edits.length > 0 ? applyEdits(value, edits) : undefined;
}

/**
 * Rewrites the url() and src() values of a declaration, when its text has a candidate.
 * @type {Reducer}
 */
const reduceValue = (buffer) => {
  const text = buffer.text();
  if (!URL_CANDIDATE_REGEX.test(text)) return;
  const updated = normalizeUrls(text);
  if (updated !== undefined) buffer.replaceText(updated);
};

/**
 * The stage for one run. Its value reducer serves every declaration, and its
 * prelude reducers serve the import, namespace and supports at-rules, which
 * the walk reads without comments.
 *
 * @return {Stage}
 */
function urlStage() {
  return {
    forProperty: () => reduceValue,
    forAtRule(name) {
      switch (asciiLowerCase(name)) {
        case 'import':
          return (text) => normalizeImportUrls(text) ?? text;
        case 'namespace':
          return (text) => normalizeNamespaceUrls(text) ?? text;
        case 'supports':
          return (text) =>
            URL_CANDIDATE_REGEX.test(text)
              ? (normalizeUrls(text) ?? text)
              : text;
        default:
          return null;
      }
    },
  };
}

/** @satisfies {StageEntry} */
const urlEntry = {
  create: () => urlStage(),
};

export { urlEntry as default };

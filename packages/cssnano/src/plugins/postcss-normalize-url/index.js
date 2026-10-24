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
 * @param {readonly CSSToken[]} tokens
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
 * Inspect contents of a url() or src() function token. The string is
 * reported by index, or -1 when there is none.
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @param {number} close
 * @return {{ stringIndex: number, hasModifiers: boolean, hasComment: boolean }}
 */
function scanFunction(tokens, index, close) {
  let stringIndex = -1;
  let hasModifiers = false;
  let hasComment = false;
  for (let i = index + 1; i < close; i++) {
    const type = tokens[i][0];
    if (type === TokenType.Whitespace) continue;
    if (type === TokenType.Comment) {
      hasComment = true;
      break;
    }
    if (stringIndex === -1) {
      if (type === TokenType.String && isClosedString(tokens[i][1])) {
        stringIndex = i;
      } else {
        break;
      }
    } else {
      hasModifiers = true;
      break;
    }
  }
  return { stringIndex, hasModifiers, hasComment };
}

/**
 * A visitor for one URL source. The range is token indexes, `start` up to
 * `end` exclusive. `nameToken` is the URL or function token that wrote the
 * source, or undefined for a bare string.
 * @typedef {(start: number, end: number, decoded: string, quote: string, nameToken: CSSToken | undefined) => void} UrlVisitor
 */

/**
 * Extracts the target of an import declaration,
 * returning the next token index and validity. The target is reported
 * without a function name, so that it is written as a string.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @param {UrlVisitor} callback
 * @return {{ nextIndex: number, valid: boolean }}
 */
function processImportTarget(tokens, index, callback) {
  const token = tokens[index];
  const type = token[0];
  if (type === TokenType.String && isClosedString(token[1])) {
    callback(index, index + 1, token[4].value, token[1][0], undefined);
    return { nextIndex: index, valid: true };
  }
  if (type === TokenType.URL) {
    callback(index, index + 1, token[4].value, '', undefined);
    return { nextIndex: index, valid: true };
  }
  if (type === TokenType.Function && asciiLowerCase(token[4].value) === 'url') {
    const close = findFunctionEnd(tokens, index);
    if (close !== -1) {
      const { stringIndex, hasModifiers, hasComment } = scanFunction(
        tokens,
        index,
        close
      );
      if (stringIndex !== -1 && !hasModifiers && !hasComment) {
        const string = /** @type {TokenString} */ (tokens[stringIndex]);
        callback(index, close + 1, string[4].value, string[1][0], undefined);
        return { nextIndex: close, valid: true };
      }
    }
  }
  return { nextIndex: index, valid: false };
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @param {UrlVisitor} callback
 * @return {number} close index or -1
 */
function processFunctionToken(tokens, index, callback) {
  const close = findFunctionEnd(tokens, index);
  if (close === -1) return -1;

  const { stringIndex, hasModifiers, hasComment } = scanFunction(
    tokens,
    index,
    close
  );
  if (stringIndex !== -1 && !hasComment) {
    const string = /** @type {TokenString} */ (tokens[stringIndex]);
    if (hasModifiers) {
      callback(
        stringIndex,
        stringIndex + 1,
        string[4].value,
        string[1][0],
        undefined
      );
    } else {
      callback(index, close + 1, string[4].value, string[1][0], tokens[index]);
    }
  }

  return close;
}

/**
 * Visit complete url() and src() ranges, top-level strings, or modifier string tokens.
 * @param {readonly CSSToken[]} tokens
 * @param {UrlVisitor} callback
 * @param {{ includeStrings?: boolean, isImport?: boolean }} [options]
 * @return {void}
 */
function forEachUrl(tokens, callback, options = {}) {
  const { includeStrings = false, isImport = false } = options;
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
      callback(index, index + 1, token[4].value, '', token);
      continue;
    }

    if (
      includeStrings &&
      type === TokenType.String &&
      isClosedString(token[1])
    ) {
      callback(index, index + 1, token[4].value, token[1][0], undefined);
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
 * The text of the tokens from `start` up to `end`, exclusive.
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {string}
 */
function textOf(tokens, start, end) {
  let text = '';
  for (let index = start; index < end; index++) text += tokens[index][1];
  return text;
}

/**
 * The token edits that rewrite each URL source whose normal form differs from
 * its tokens, in ascending order.
 * @param {readonly CSSToken[]} tokens
 * @param {{ includeStrings?: boolean, isImport?: boolean }} [options]
 * @return {{start: number, end: number, tokens: CSSToken[]}[]}
 */
function urlTokenEdits(tokens, options) {
  /** @type {{start: number, end: number, tokens: CSSToken[]}[]} */
  const edits = [];
  forEachUrl(
    tokens,
    (start, end, decoded, quote, nameToken) => {
      const replacement = normalizeUrlTokenValue(decoded, quote, nameToken);
      if (
        replacement !== undefined &&
        textOf(replacement, 0, replacement.length) !==
          textOf(tokens, start, end)
      ) {
        edits.push({ start, end, tokens: replacement });
      }
    },
    options
  );
  return edits;
}

/**
 * @param {string} value
 * @param {{ isImport?: boolean }} [options]
 * @return {string | undefined}
 */
function normalizeUrls(value, options) {
  const tokens = [...tokenize({ css: value })];
  const edits = urlTokenEdits(tokens, options);
  if (edits.length === 0) return undefined;
  return applyEdits(
    value,
    edits.map(({ start, end, tokens: replacement }) => ({
      start: tokens[start][2],
      end: tokens[end - 1][3] + 1,
      text: textOf(replacement, 0, replacement.length),
    }))
  );
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
  const tokens = [...tokenize({ css: value })];
  /** @type {{start: number, end: number, text: string}[]} */
  const edits = [];
  forEachUrl(
    tokens,
    (start, end, decoded, quote, nameToken) => {
      const text = nameToken
        ? `"${escapeForString(decoded, '"')}"`
        : `${quote}${escapeForString(decoded, quote)}${quote}`;
      if (text !== textOf(tokens, start, end)) {
        edits.push({
          start: tokens[start][2],
          end: tokens[end - 1][3] + 1,
          text,
        });
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
  if (!buffer.isEdited() && !URL_CANDIDATE_REGEX.test(buffer.text())) return;
  buffer.replaceRanges(urlTokenEdits(buffer.tokens(), {}));
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

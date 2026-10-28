import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { stringToken } from '../../values/tokenConstructors.js';
import { escapeForString, normalizeUrlTokenValue } from './urls.js';

/** @import {CSSToken, TokenString} from '@csstools/css-tokenizer' */
/** @import {AtRulePart, Reducer, Stage, StageEntry} from '../../pipeline/host.js' */
/** @import {ValueBuffer} from '../../values/valueBuffer.js' */

const { asciiLowerCase } = cssnanoUtils;
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
 * Rewrites the URL sources of the buffer that `options` selects, as token edits.
 * @param {ValueBuffer} buffer
 * @param {{ isImport?: boolean }} options
 * @return {void}
 */
function reduceUrls(buffer, options) {
  const edits = urlTokenEdits(buffer.tokens(), options);
  if (edits.length > 0) buffer.replaceRanges(edits);
}

/**
 * The token edits that rewrite the url() and string sources of an @namespace
 * prelude as strings. A namespace name is compared literally, so its whitespace
 * is kept.
 * @param {readonly CSSToken[]} tokens
 * @return {{start: number, end: number, tokens: CSSToken[]}[]}
 */
function namespaceTokenEdits(tokens) {
  /** @type {{start: number, end: number, tokens: CSSToken[]}[]} */
  const edits = [];
  forEachUrl(
    tokens,
    (start, end, decoded, quote, nameToken) => {
      const text = nameToken
        ? `"${escapeForString(decoded, '"')}"`
        : `${quote}${escapeForString(decoded, quote)}${quote}`;
      if (text !== textOf(tokens, start, end)) {
        edits.push({ start, end, tokens: [stringToken(text, decoded)] });
      }
    },
    { includeStrings: true }
  );
  return edits;
}

/**
 * Rewrites the url() and src() values of a declaration, or of an @supports
 * prelude, when its text has a candidate.
 * @type {Reducer}
 */
const reduceValue = (buffer) => {
  if (!buffer.isEdited() && !URL_CANDIDATE_REGEX.test(buffer.text())) return;
  buffer.replaceRanges(urlTokenEdits(buffer.tokens(), {}));
};

/**
 * Rewrites the url() and string sources of an @namespace prelude.
 * @type {Reducer}
 */
const reduceNamespaceUrls = (buffer) => {
  const edits = namespaceTokenEdits(buffer.tokens());
  if (edits.length > 0) buffer.replaceRanges(edits);
};

// The options of an import prelude, whose first source is its target.
const importOptions = { isImport: true };

/** @type {AtRulePart} */
const importPart = { buffer: (buffer) => reduceUrls(buffer, importOptions) };
/** @type {AtRulePart} */
const namespacePart = { buffer: reduceNamespaceUrls };
/** @type {AtRulePart} */
const supportsPart = { buffer: reduceValue };

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
          return importPart;
        case 'namespace':
          return namespacePart;
        case 'supports':
          return supportsPart;
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

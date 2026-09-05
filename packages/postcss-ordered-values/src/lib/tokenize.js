import cssnanoUtils from 'cssnano-utils';

const { TokenType, decoded, tokenEnd, tokenStart, tokens } = cssnanoUtils;

const closeFor = new Map([
  [TokenType.Function, TokenType.CloseParen],
  [TokenType.OpenParen, TokenType.CloseParen],
  [TokenType.OpenSquare, TokenType.CloseSquare],
  [TokenType.OpenCurly, TokenType.CloseCurly],
]);

/**
 * A raw top-level component. Its source is intentionally never reserialized:
 * CSS escapes and malformed-but-tokenizable input must survive a rewrite.
 *
 * @typedef {{ raw: string, tokens: import('@csstools/css-tokenizer').CSSToken[] }} Term
 */

/** @param {Term} term */
function name(term) {
  const token = term.tokens[0];
  if (
    !token ||
    (token[0] !== TokenType.Ident && token[0] !== TokenType.Function)
  ) {
    return '';
  }
  return decoded(token)?.toLowerCase() ?? '';
}

/** @param {string} value @param {string} expected */
function equalsAsciiCaseInsensitive(value, expected) {
  if (value.length !== expected.length) return false;
  for (let index = 0; index < value.length; index++) {
    let code = value.charCodeAt(index);
    if (code >= 65 && code <= 90) code += 32;
    if (code !== expected.charCodeAt(index)) return false;
  }
  return true;
}

/** @param {import('@csstools/css-tokenizer').CSSToken} token */
function isVariableFunction(token) {
  if (token[0] !== TokenType.Function) return false;
  const value = decoded(token);
  if (!value) return false;
  return (
    equalsAsciiCaseInsensitive(value, 'var') ||
    equalsAsciiCaseInsensitive(value, 'env') ||
    equalsAsciiCaseInsensitive(value, 'constant')
  );
}

/** @param {Term} term */
function isDimension(term) {
  return term.tokens.length === 1 && term.tokens[0][0] === TokenType.Dimension;
}

/** @param {Term} term */
function isNumber(term) {
  return term.tokens.length === 1 && term.tokens[0][0] === TokenType.Number;
}

/** @param {Term} term */
function isFunction(term) {
  return term.tokens[0]?.[0] === TokenType.Function;
}

/** @param {Term} term */
function isUrl(term) {
  return term.tokens.length === 1 && term.tokens[0][0] === TokenType.URL;
}

/** @param {Term} term */
function isIdent(term) {
  return term.tokens.length === 1 && term.tokens[0][0] === TokenType.Ident;
}

/**
 * Tokenize a declaration in a single streaming pass and split it at top-level
 * whitespace, commas, and structural slashes.
 *
 * @param {string} value
 * @return {{ arguments: Term[][], terms: Term[], abort: boolean, value: string }}
 */
function tokenizeValue(value) {
  /** @type {Term[][]} */
  const argumentsList = [[]];
  /** @type {Term[]} */
  const terms = [];
  /** @type {import('@csstools/css-tokenizer').CSSToken[]} */
  let current = [];
  /** @type {string[]} */
  const stack = [];
  let abort = false;
  const hasCssLoaderImport = value.includes('___CSS_LOADER_IMPORT___');

  const pushTerm = () => {
    if (current.length === 0) return;
    const term = {
      raw: value.slice(
        tokenStart(current[0]),
        tokenEnd(current[current.length - 1])
      ),
      tokens: current,
    };
    argumentsList[argumentsList.length - 1].push(term);
    terms.push(term);
    current = [];
  };

  for (const token of tokens(value)) {
    const type = token[0];
    if (
      type === TokenType.Comment ||
      isVariableFunction(token) ||
      (hasCssLoaderImport && token[1].includes('___CSS_LOADER_IMPORT___'))
    ) {
      abort = true;
    }

    if (stack.length === 0) {
      if (type === TokenType.Whitespace) {
        pushTerm();
        continue;
      }
      // Keep slash delimiters available to grammar-aware consumers. A slash
      // inside a function or block remains part of that single nested term.
      if (type === TokenType.Delim && token[1] === '/') {
        pushTerm();
        current.push(token);
        pushTerm();
        continue;
      }
      if (type === TokenType.Comma) {
        pushTerm();
        argumentsList.push([]);
        continue;
      }
    }

    current.push(token);
    const expected = closeFor.get(type);
    if (expected !== undefined) {
      stack.push(expected);
    } else if (
      type === TokenType.CloseParen ||
      type === TokenType.CloseSquare ||
      type === TokenType.CloseCurly
    ) {
      if (stack.pop() !== type) abort = true;
    }
  }

  pushTerm();
  if (stack.length > 0) abort = true;
  return { arguments: argumentsList, terms, abort, value };
}

/** @param {Term[][]} arguments_ */
function serializeArguments(arguments_) {
  return arguments_
    .map((terms) => terms.map((term) => term.raw).join(' '))
    .join(',');
}

export {
  isDimension,
  isFunction,
  isIdent,
  isNumber,
  isUrl,
  name,
  serializeArguments,
  tokenizeValue,
};

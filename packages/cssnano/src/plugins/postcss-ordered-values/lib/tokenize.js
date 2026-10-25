import cssnanoUtils from '#utils';
import cssWideKeywords from '../rules/cssWideKeywords.json' with { type: 'json' };
import { comma } from '../../../values/listSeparators.js';
import { whitespace } from '../../../values/tokenConstructors.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { TokenType, asciiLowerCase, closeForOpening, decoded } = cssnanoUtils;

/** The placeholder that css-loader leaves for an import. */
const cssLoaderImportMarker = '___CSS_LOADER_IMPORT___';

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
  return asciiLowerCase(decoded(token) ?? '');
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
  return (
    (term.tokens.length === 1 && term.tokens[0][0] === TokenType.URL) ||
    (isFunction(term) && name(term) === 'url')
  );
}

/** @param {Term} term */
function isIdent(term) {
  return term.tokens.length === 1 && term.tokens[0][0] === TokenType.Ident;
}

/** @param {Term} term */
function isHash(term) {
  return term.tokens.length === 1 && term.tokens[0][0] === TokenType.Hash;
}

/** @param {Term} term */
function isString(term) {
  return term.tokens.length === 1 && term.tokens[0][0] === TokenType.String;
}

/** @param {Term} term */
function isPercentage(term) {
  return term.tokens.length === 1 && term.tokens[0][0] === TokenType.Percentage;
}

/** @param {Term} term @param {string} [char] */
function isDelim(term, char) {
  if (term.tokens.length !== 1 || term.tokens[0][0] !== TokenType.Delim) {
    return false;
  }
  return char === undefined || term.tokens[0][1] === char;
}

/**
 * Splits the tokens of a declaration at top-level whitespace, commas, and
 * structural slashes. A term's raw text is the text of its tokens, so terms
 * built from tokens an earlier stage made still read back as their text.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} value the tokens of the value
 * @return {{ arguments: Term[][], terms: Term[], abort: boolean }}
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

  const pushTerm = () => {
    if (current.length === 0) return;
    const term = {
      raw: current.map((token) => token[1]).join(''),
      tokens: current,
    };
    argumentsList[argumentsList.length - 1].push(term);
    terms.push(term);
    current = [];
  };

  for (const token of value) {
    const type = token[0];
    if (
      type === TokenType.Comment ||
      type === TokenType.BadString ||
      type === TokenType.BadURL ||
      isVariableFunction(token) ||
      token[1].includes(cssLoaderImportMarker)
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
    const expected = closeForOpening(type);
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
  return { arguments: argumentsList, terms, abort };
}

/**
 * The tokens of the groups in order, with `separator` between each pair. An
 * empty group adds nothing, so a caller drops the groups it does not keep.
 *
 * @param {readonly (readonly CSSToken[])[]} groups
 * @param {CSSToken} separator
 * @return {CSSToken[]}
 */
function joinTokens(groups, separator) {
  /** @type {CSSToken[]} */
  const joined = [];
  for (let index = 0; index < groups.length; index++) {
    if (index > 0) joined.push(separator);
    for (const token of groups[index]) joined.push(token);
  }
  return joined;
}

/**
 * The tokens of a comma-separated list of arguments, each argument's terms
 * separated by whitespace.
 *
 * @param {Term[][]} arguments_
 * @return {CSSToken[]}
 */
function argumentTokens(arguments_) {
  return joinTokens(
    arguments_.map((terms) =>
      joinTokens(
        terms.map((term) => term.tokens),
        whitespace()
      )
    ),
    comma()
  );
}

/* `default` is reserved for custom identifiers although it is not CSS-wide. */
const reservedIdentKeywords = new Set([...cssWideKeywords.keywords, 'default']);

export {
  argumentTokens,
  reservedIdentKeywords,
  isDelim,
  isDimension,
  isFunction,
  isHash,
  isIdent,
  isNumber,
  isPercentage,
  isString,
  isUrl,
  joinTokens,
  name,
  tokenizeValue,
};

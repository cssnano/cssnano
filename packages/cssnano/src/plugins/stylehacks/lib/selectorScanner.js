import {
  isTokenComment,
  isTokenDelim,
  isTokenIdent,
  isTokenWhitespace,
  tokenize,
  TokenType,
} from '@csstools/css-tokenizer';

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */

const closing = new Map([
  [TokenType.Function, TokenType.CloseParen],
  [TokenType.OpenParen, TokenType.CloseParen],
  [TokenType.OpenSquare, TokenType.CloseSquare],
  [TokenType.OpenCurly, TokenType.CloseCurly],
]);

const matchers = {
  'star-html': matchStarHtml,
  'html-first-child': matchHtmlFirstChild,
  'html-comment-body': matchHtmlCommentBody,
  'body-empty': matchBodyEmpty,
};

/** @typedef {'star-html'|'html-first-child'|'html-comment-body'|'body-empty'} SelectorHack */
/** @typedef {Record<SelectorHack, string[]>} SelectorHackResults */

/** @type {WeakMap<import('postcss').Rule, {selector: string, raw: string | undefined, selectorResults: SelectorHackResults, rawResults: SelectorHackResults | undefined}>} */
const ruleCache = new WeakMap();

/** @type {SelectorHack[]} */
const hackKinds = [
  'star-html',
  'html-first-child',
  'html-comment-body',
  'body-empty',
];

/**
 * Tokenize selectors and split them at balanced, top-level commas. The
 * scanner deliberately has no selector grammar: the four legacy tuple
 * layouts below are the only grammar it knows about.
 *
 * @param {string} source
 * @param {SelectorHack} hack
 * @return {string[]}
 */
export function findSelectorHacks(source, hack) {
  return scanSelectorHacks(source)[hack];
}

/**
 * Scan each selector source once and share all four detector results.
 *
 * @param {string} source
 * @return {SelectorHackResults}
 */
function scanSelectorHacks(source) {
  /** @type {SelectorHackResults} */
  const result = {
    'star-html': [],
    'html-first-child': [],
    'html-comment-body': [],
    'body-empty': [],
  };
  const alternatives = splitAlternatives(source);
  if (alternatives === undefined) return result;

  for (const alternative of alternatives) {
    for (const hack of hackKinds) {
      if (matchers[hack](alternative.tokens)) {
        result[hack].push(alternative.source);
      }
    }
  }
  return result;
}

/**
 * Get selector hacks for a PostCSS rule. The parsed selector and raw selector
 * are cached independently because the comment-body detector intentionally
 * reads the raw selector source.
 *
 * @param {import('postcss').Rule} rule
 * @return {{selector: SelectorHackResults, raw: SelectorHackResults | undefined}}
 */
export function findRuleSelectorHacks(rule) {
  const selector = rule.selector;
  const raw = rule.raws.selector?.raw;
  const cached = ruleCache.get(rule);
  if (cached && cached.selector === selector && cached.raw === raw) {
    return { selector: cached.selectorResults, raw: cached.rawResults };
  }

  const selectorResults = scanSelectorHacks(selector);
  const rawResults = raw === undefined ? undefined : scanSelectorHacks(raw);
  ruleCache.set(rule, { selector, raw, selectorResults, rawResults });
  return { selector: selectorResults, raw: rawResults };
}

/** @param {string} source @return {{source: string, tokens: CSSToken[]}[] | undefined} */
function splitAlternatives(source) {
  /** @type {{source: string, tokens: CSSToken[]}[]} */
  const result = [];
  /** @type {CSSToken[]} */
  let tokens = [];
  /** @type {TokenType[]} */
  const stack = [];
  let start = 0;

  try {
    for (const token of tokenize({ css: source })) {
      const type = token[0];
      if (type === TokenType.EOF) break;

      if (type === TokenType.String && !isClosedString(token[1])) {
        return undefined;
      }
      if (isTokenComment(token) && !token[1].endsWith('*/')) {
        return undefined;
      }

      const expected = closing.get(type);
      if (expected !== undefined) {
        stack.push(expected);
      } else if (isClosing(type)) {
        if (stack.pop() !== type) return undefined;
      } else if (type === TokenType.Comma && stack.length === 0) {
        result.push({ source: source.slice(start, token[2]), tokens });
        start = token[3] + 1;
        tokens = [];
        continue;
      }
      tokens.push(token);
    }
  } catch {
    return undefined;
  }

  if (stack.length !== 0) return undefined;
  result.push({ source: source.slice(start), tokens });
  return result;
}

/** @param {TokenType} type @return {boolean} */
function isClosing(type) {
  return (
    type === TokenType.CloseParen ||
    type === TokenType.CloseSquare ||
    type === TokenType.CloseCurly
  );
}

/** @param {string} value @return {boolean} */
function isClosedString(value) {
  if (value.length < 2 || (value[0] !== '"' && value[0] !== "'")) {
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

/** @param {CSSToken[]} tokens @return {boolean} */
function matchStarHtml(tokens) {
  let index = 0;
  while (isWhitespace(tokens[index])) index++;
  return (
    delimiter(tokens[index++], '*') &&
    requiredWhitespace(tokens, index++) &&
    identifier(tokens[index++], 'html') &&
    requiredWhitespace(tokens, index++) &&
    hasTrailingContent(tokens, index)
  );
}

/** @param {CSSToken[]} tokens @return {boolean} */
function matchHtmlFirstChild(tokens) {
  return matchPseudo(tokens, 'html', 'first-child');
}

/** @param {CSSToken[]} tokens @return {boolean} */
function matchBodyEmpty(tokens) {
  return matchPseudo(tokens, 'body', 'empty');
}

/** @param {CSSToken[]} tokens @param {string} element @param {string} pseudo @return {boolean} */
function matchPseudo(tokens, element, pseudo) {
  let index = 0;
  while (isWhitespace(tokens[index])) index++;
  return (
    identifier(tokens[index++], element) &&
    delimiter(tokens[index++], ':') &&
    identifier(tokens[index++], pseudo) &&
    requiredWhitespace(tokens, index++) &&
    hasTrailingContent(tokens, index)
  );
}

/** @param {CSSToken[]} tokens @return {boolean} */
function matchHtmlCommentBody(tokens) {
  let index = 0;
  while (isCombinatorWhitespace(tokens[index])) index++;
  if (!identifier(tokens[index++], 'html')) return false;
  while (isCombinatorWhitespace(tokens[index])) index++;
  if (!delimiter(tokens[index], '>') && !delimiter(tokens[index], '~')) {
    return false;
  }
  index++;
  while (isWhitespace(tokens[index])) index++;
  if (!isComment(tokens[index++])) return false;
  if (!requiredWhitespace(tokens, index++)) return false;
  while (isCombinatorWhitespace(tokens[index])) index++;
  return (
    identifier(tokens[index++], 'body') &&
    requiredWhitespace(tokens, index++) &&
    hasTrailingContent(tokens, index)
  );
}

/** @param {CSSToken | undefined} token @param {string} value @return {boolean} */
function identifier(token, value) {
  return isTokenIdent(token) && token[4].value.toLowerCase() === value;
}

/** @param {CSSToken | undefined} token @param {string} value @return {boolean} */
function delimiter(token, value) {
  return (
    (isTokenDelim(token) || token?.[0] === TokenType.Colon) &&
    token[1] === value
  );
}

/** @param {CSSToken[]} tokens @param {number} index @return {boolean} */
function requiredWhitespace(tokens, index) {
  return isWhitespace(tokens[index]);
}

/** @param {CSSToken[]} tokens @param {number} index @return {boolean} */
function hasTrailingContent(tokens, index) {
  for (let cursor = index; cursor < tokens.length; cursor++) {
    if (!isWhitespace(tokens[cursor]) && !isComment(tokens[cursor])) {
      return true;
    }
  }
  return false;
}

/** @param {CSSToken | undefined} token @return {boolean} */
function isWhitespace(token) {
  return token !== undefined && isTokenWhitespace(token);
}

/** @param {CSSToken | undefined} token @return {boolean} */
function isCombinatorWhitespace(token) {
  return isWhitespace(token) || isComment(token);
}

/** @param {CSSToken | undefined} token @return {boolean} */
function isComment(token) {
  return token !== undefined && isTokenComment(token);
}

'use strict';
const {
  tokenize,
  hasPseudoElementOrNesting,
  hasNthChildOfClause,
  hasUnsafeForFold,
  specificityOfMiddle,
  equalSpecificity,
  joinTokens,
} = require('./foldToIsHelpers.js');

/**
 * @param {import('postcss-selector-parser').Root} root
 * @return {string | null}
 */
function tryFold(root) {
  const selectors = getSelectors(root);
  if (selectors.length < 2) {
    return null;
  }

  const tokenLists = selectors.map(tokenize);

  if (!haveNonEmptyTokenLists(tokenLists)) {
    return null;
  }

  const { prefix, suffix } = findSharedEdges(tokenLists);

  if (prefix === 0 && suffix === 0) {
    return null;
  }

  const middles = getMiddles(tokenLists, prefix, suffix);
  if (!middles || !areCompoundMiddles(middles)) {
    return null;
  }

  if (!areSafeMiddles(middles) || !haveEqualSpecificity(middles)) {
    return null;
  }

  const middleStrs = uniqueMiddleStrings(middles);
  if (middleStrs.length < 2) {
    return null;
  }

  const firstTokens = tokenLists[0];
  const prefixStr = joinTokens(firstTokens.slice(0, prefix));
  const suffixStr = joinTokens(firstTokens.slice(firstTokens.length - suffix));
  const folded = `${prefixStr}:is(${middleStrs.join(',')})${suffixStr}`;

  const original = selectors.map((s) => String(s)).join(',');
  if (folded.length >= original.length) {
    return null;
  }

  return folded;
}

/**
 * @param {import('postcss-selector-parser').Root} root
 * @return {import('postcss-selector-parser').Selector[]}
 */
function getSelectors(root) {
  return /** @type {import('postcss-selector-parser').Selector[]} */ (
    root.nodes.filter((n) => n.type === 'selector')
  );
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} tokenLists
 * @return {boolean}
 */
function haveNonEmptyTokenLists(tokenLists) {
  return !tokenLists.some((tokens) => tokens.length === 0);
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} tokenLists
 * @return {{prefix: number, suffix: number}}
 */
function findSharedEdges(tokenLists) {
  const minLen = Math.min(...tokenLists.map((tokens) => tokens.length));
  const prefix = findPrefix(tokenLists, minLen);
  const suffix = findSuffix(tokenLists, minLen, prefix);
  return {
    prefix: moveToCompoundBoundary(tokenLists[0], prefix, -1),
    suffix: moveToCompoundBoundary(tokenLists[0], suffix, 1),
  };
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} tokenLists
 * @param {number} minLen
 * @return {number}
 */
function findPrefix(tokenLists, minLen) {
  let prefix = 0;
  while (prefix < minLen && tokensMatchAt(tokenLists, prefix)) {
    prefix++;
  }
  return prefix;
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} tokenLists
 * @param {number} minLen
 * @param {number} prefix
 * @return {number}
 */
function findSuffix(tokenLists, minLen, prefix) {
  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    suffixTokensMatch(tokenLists, suffix, prefix)
  ) {
    suffix++;
  }
  return suffix;
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} tokenLists
 * @param {number} index
 * @return {boolean}
 */
function tokensMatchAt(tokenLists, index) {
  const ref = tokenLists[0][index];
  return tokenLists.every(
    (tokens) => tokens[index].kind === ref.kind && tokens[index].str === ref.str
  );
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} tokenLists
 * @param {number} suffix
 * @param {number} prefix
 * @return {boolean}
 */
function suffixTokensMatch(tokenLists, suffix, prefix) {
  const refIndex = tokenLists[0].length - 1 - suffix;
  const ref = tokenLists[0][refIndex];
  return tokenLists.every((tokens) => {
    const index = tokens.length - 1 - suffix;
    return (
      index >= prefix &&
      tokens[index].kind === ref.kind &&
      tokens[index].str === ref.str
    );
  });
}

/**
 * @param {import('./foldToIsHelpers.js').Token[]} tokens
 * @param {number} count
 * @param {number} direction
 * @return {number}
 */
function moveToCompoundBoundary(tokens, count, direction) {
  let remaining = count;
  while (
    remaining > 0 &&
    tokens[direction === -1 ? remaining - 1 : tokens.length - remaining]
      .kind !== 'combinator'
  ) {
    remaining--;
  }
  return remaining;
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} tokenLists
 * @param {number} prefix
 * @param {number} suffix
 * @return {import('./foldToIsHelpers.js').Token[][] | null}
 */
function getMiddles(tokenLists, prefix, suffix) {
  const middles = tokenLists.map((tokens) =>
    tokens.slice(prefix, tokens.length - suffix)
  );
  return middles.some((middle) => middle.length === 0) ? null : middles;
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} middles
 * @return {boolean}
 */
function areCompoundMiddles(middles) {
  // Each middle must be a single compound. Combinators inside change the
  // matched element under `:is()`. See cssnano/cssnano#1786.
  return !middles.some((middle) =>
    middle.some((token) => token.kind === 'combinator')
  );
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} middles
 * @return {boolean}
 */
function areSafeMiddles(middles) {
  return !middles.some((middle) =>
    middle.some(
      (token) =>
        hasPseudoElementOrNesting(token) ||
        hasNthChildOfClause(token) ||
        hasUnsafeForFold(token)
    )
  );
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} middles
 * @return {boolean}
 */
function haveEqualSpecificity(middles) {
  const firstSpec = specificityOfMiddle(middles[0]);
  return middles
    .slice(1)
    .every((middle) =>
      equalSpecificity(firstSpec, specificityOfMiddle(middle))
    );
}

/**
 * @param {import('./foldToIsHelpers.js').Token[][]} middles
 * @return {string[]}
 */
function uniqueMiddleStrings(middles) {
  const middleStrs = [];
  const seen = new Set();
  for (const middle of middles) {
    const string = joinTokens(middle);
    if (!seen.has(string)) {
      seen.add(string);
      middleStrs.push(string);
    }
  }
  return middleStrs;
}

module.exports = tryFold;

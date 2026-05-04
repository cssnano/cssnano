'use strict';
const {
  tokenize,
  hasPseudoElementOrNesting,
  hasNthChildOfClause,
  hasUnknownPseudoWithArgs,
  specificityOfMiddle,
  equalSpecificity,
  joinTokens,
} = require('./foldToIsHelpers.js');

/**
 * @param {import('postcss-selector-parser').Root} root
 * @return {string | null}
 */
function tryFold(root) {
  const selectors = /** @type {import('postcss-selector-parser').Selector[]} */ (
    root.nodes.filter((n) => n.type === 'selector')
  );
  if (selectors.length < 2) {
    return null;
  }

  const tokenLists = selectors.map(tokenize);

  if (tokenLists.some((t) => t.length === 0)) {
    return null;
  }

  let prefix = 0;
  const minLen = Math.min(...tokenLists.map((t) => t.length));
  while (prefix < minLen) {
    const ref = tokenLists[0][prefix];
    const allMatch = tokenLists.every(
      (t) => t[prefix].kind === ref.kind && t[prefix].str === ref.str
    );
    if (!allMatch) {
      break;
    }
    prefix++;
  }

  let suffix = 0;
  while (suffix < minLen - prefix) {
    const refIdx = tokenLists[0].length - 1 - suffix;
    const ref = tokenLists[0][refIdx];
    const allMatch = tokenLists.every((t) => {
      const idx = t.length - 1 - suffix;
      return idx >= prefix && t[idx].kind === ref.kind && t[idx].str === ref.str;
    });
    if (!allMatch) {
      break;
    }
    suffix++;
  }

  const firstTokens = tokenLists[0];
  while (prefix > 0 && firstTokens[prefix - 1].kind !== 'combinator') {
    prefix--;
  }
  while (suffix > 0 && firstTokens[firstTokens.length - suffix].kind !== 'combinator') {
    suffix--;
  }

  if (prefix === 0 && suffix === 0) {
    return null;
  }

  const middles = tokenLists.map((t) => t.slice(prefix, t.length - suffix));

  if (middles.some((m) => m.length === 0)) {
    return null;
  }

  for (const middle of middles) {
    for (const token of middle) {
      if (hasPseudoElementOrNesting(token)) {
        return null;
      }
      if (hasNthChildOfClause(token)) {
        return null;
      }
      if (hasUnknownPseudoWithArgs(token)) {
        return null;
      }
    }
  }

  const firstSpec = specificityOfMiddle(middles[0]);
  for (let i = 1; i < middles.length; i++) {
    if (!equalSpecificity(firstSpec, specificityOfMiddle(middles[i]))) {
      return null;
    }
  }

  const middleStrs = [];
  const seen = new Set();
  for (const m of middles) {
    const s = joinTokens(m);
    if (!seen.has(s)) {
      seen.add(s);
      middleStrs.push(s);
    }
  }
  if (middleStrs.length < 2) {
    return null;
  }

  const prefixStr = joinTokens(firstTokens.slice(0, prefix));
  const suffixStr = joinTokens(firstTokens.slice(firstTokens.length - suffix));
  const folded = `${prefixStr}:is(${middleStrs.join(',')})${suffixStr}`;

  const original = selectors.map((s) => String(s)).join(',');
  if (folded.length >= original.length) {
    return null;
  }

  return folded;
}

module.exports = tryFold;

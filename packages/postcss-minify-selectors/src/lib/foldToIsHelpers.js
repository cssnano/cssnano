'use strict';

/**
 * @typedef {object} Token
 * @property {'compound'|'combinator'} kind
 * @property {string} str
 * @property {import('postcss-selector-parser').Node[]} [nodes]
 */

/** @typedef {[number, number, number]} Specificity */

/**
 * @param {import('postcss-selector-parser').Selector} selector
 * @return {Token[]}
 */
function tokenize(selector) {
  /** @type {Token[]} */
  const tokens = [];
  /** @type {import('postcss-selector-parser').Node[]} */
  let bucket = [];

  const flush = () => {
    if (bucket.length) {
      tokens.push({
        kind: 'compound',
        str: bucket.map((n) => String(n)).join(''),
        nodes: bucket,
      });
      bucket = [];
    }
  };

  for (const node of selector.nodes) {
    if (node.type === 'combinator') {
      flush();
      tokens.push({ kind: 'combinator', str: String(node) });
    } else {
      bucket.push(node);
    }
  }
  flush();
  return tokens;
}

/**
 * @param {Token} token
 * @return {boolean}
 */
function hasPseudoElementOrNesting(token) {
  if (token.kind !== 'compound' || !token.nodes) {
    return false;
  }
  for (const n of token.nodes) {
    if (n.type === 'nesting') {
      return true;
    }
    if (n.type === 'pseudo') {
      const v = n.value;
      if (v.startsWith('::')) {
        return true;
      }
      if (
        v === ':before' ||
        v === ':after' ||
        v === ':first-letter' ||
        v === ':first-line'
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {Token} token
 * @return {boolean}
 */
function hasNthChildOfClause(token) {
  if (token.kind !== 'compound' || !token.nodes) {
    return false;
  }
  for (const n of token.nodes) {
    if (n.type !== 'pseudo') {
      continue;
    }
    if (n.value !== ':nth-child' && n.value !== ':nth-last-child') {
      continue;
    }
    for (const child of n.nodes) {
      for (const inner of child.nodes) {
        if (inner.type === 'tag' && inner.value === 'of') {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * @param {import('postcss-selector-parser').Node[]} nodes
 * @return {Specificity}
 */
function specificityOf(nodes) {
  let id = 0;
  let cls = 0;
  let type = 0;
  for (const n of nodes) {
    if (n.type === 'id') {
      id++;
    } else if (n.type === 'class' || n.type === 'attribute') {
      cls++;
    } else if (n.type === 'pseudo') {
      const v = n.value;
      if (v.startsWith('::')) {
        type++;
        continue;
      }
      if (v === ':where') {
        continue;
      }
      if (v === ':is' || v === ':matches' || v === ':not' || v === ':has') {
        const s = maxChildSpecificity(n);
        id += s[0];
        cls += s[1];
        type += s[2];
        continue;
      }
      if (
        v === ':before' ||
        v === ':after' ||
        v === ':first-letter' ||
        v === ':first-line'
      ) {
        type++;
      } else {
        cls++;
      }
    } else if (n.type === 'tag') {
      type++;
    }
  }
  return [id, cls, type];
}

/**
 * @param {import('postcss-selector-parser').Pseudo} pseudo
 * @return {Specificity}
 */
function maxChildSpecificity(pseudo) {
  /** @type {Specificity} */
  let best = [0, 0, 0];
  for (const child of pseudo.nodes) {
    if (child.type !== 'selector') {
      continue;
    }
    const s = specificityOf(child.nodes);
    if (compareSpecificity(s, best) > 0) {
      best = s;
    }
  }
  return best;
}

/**
 * Sums the specificity of compound tokens in a fold middle — the divergent
 * portion of a selector list, between the shared prefix and shared suffix.
 *
 * @param {Token[]} middle
 * @return {Specificity}
 */
function specificityOfMiddle(middle) {
  let id = 0;
  let cls = 0;
  let type = 0;
  for (const token of middle) {
    if (token.kind !== 'compound' || !token.nodes) {
      continue;
    }
    const s = specificityOf(token.nodes);
    id += s[0];
    cls += s[1];
    type += s[2];
  }
  return [id, cls, type];
}

/**
 * @param {Specificity} a
 * @param {Specificity} b
 * @return {number}
 */
function compareSpecificity(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * @param {Specificity} a
 * @param {Specificity} b
 * @return {boolean}
 */
function equalSpecificity(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/**
 * @param {Token[]} tokens
 * @return {string}
 */
function joinTokens(tokens) {
  return tokens.map((t) => t.str).join('');
}

module.exports = {
  tokenize,
  hasPseudoElementOrNesting,
  hasNthChildOfClause,
  specificityOf,
  specificityOfMiddle,
  maxChildSpecificity,
  compareSpecificity,
  equalSpecificity,
  joinTokens,
};

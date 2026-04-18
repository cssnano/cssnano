'use strict';

// Folds sibling selectors in a comma-separated list by factoring out a common
// prefix and/or suffix into a shared `:is()` group.
//
// The specificity guard below is what keeps the rewrite safe w.r.t. the
// cascade: `:is(a, b)` takes the max specificity of its arguments, so folding
// selectors whose divergent parts have different specificities would silently
// change which rule wins at match time.

/**
 * @typedef {object} Token
 * @property {'compound'|'combinator'} kind
 * @property {string} str
 * @property {import('postcss-selector-parser').Node[]} [nodes]
 */

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
 * Pseudo-elements cannot live inside `:is()`; nesting `&` would change meaning.
 *
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

/** @typedef {[number, number, number]} Specificity */

/**
 * Specificity contribution of a list of simple-selector nodes, following the
 * nested-specificity rules for `:is()`, `:not()`, `:has()`, and `:where()`.
 *
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
      // Legacy single-colon pseudo-elements count as type.
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
function sameSpecificity(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/**
 * @param {Token[]} tokens
 * @return {string}
 */
function joinTokens(tokens) {
  return tokens.map((t) => t.str).join('');
}

/**
 * Returns the folded selector list string if beneficial, otherwise null.
 *
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

  // Each prefix/suffix boundary must land on a combinator — otherwise
  // splicing `:is(...)` in would place it adjacent to a type/class token
  // in the prefix/suffix and silently change what the selector matches.
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
    }
  }

  const firstSpec = specificityOfMiddle(middles[0]);
  for (let i = 1; i < middles.length; i++) {
    if (!sameSpecificity(firstSpec, specificityOfMiddle(middles[i]))) {
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

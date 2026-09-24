import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';

const { asciiLowerCase, decoded, tokens } = cssnanoUtils;

/**
 * Parses a @layer parameter list into decoded layer-name paths. A period is a
 * separator only as a Delim token between idents; an escaped dot is part of
 * the preceding identifier's value, so `a\.b` is one segment named "a.b".
 * Whitespace and comments around separators are allowed, preserving the
 * previous handling of `a . b`.
 *
 * @param {string} params
 * @return {string[][] | null} one decoded segment path per declared name
 */
function parseLayerNameList(params) {
  const tokenList = tokens(params).filter(
    (t) => t[0] !== TokenType.Whitespace && t[0] !== TokenType.Comment
  );
  /** @type {string[][]} */
  const names = [];
  /** @type {string[] | null} */
  let current = null;
  let expectIdent = true;
  for (const token of tokenList) {
    const type = token[0];
    if (type === TokenType.Comma) {
      if (expectIdent || !current) {
        return null;
      }
      names.push(current);
      current = null;
      expectIdent = true;
    } else if (type === TokenType.Delim && token[1] === '.') {
      if (expectIdent || !current) {
        return null;
      }
      expectIdent = true;
    } else if (type === TokenType.Ident && expectIdent) {
      current ??= [];
      current.push(decoded(token));
      expectIdent = false;
    } else {
      return null;
    }
  }
  if (expectIdent) {
    return null;
  }
  if (current) {
    names.push(current);
  }
  return names;
}

/**
 * @param {import('postcss').Node} node
 * @return {import('postcss').AtRule[]} enclosing @layer at-rules, outermost first
 */
function enclosingLayerRules(node) {
  /** @type {import('postcss').AtRule[]} */
  const chain = [];
  let curr = node.parent;
  while (curr && curr.type !== 'root') {
    if (
      curr.type === 'atrule' &&
      asciiLowerCase(/** @type {import('postcss').AtRule} */ (curr).name) ===
        'layer'
    ) {
      chain.unshift(/** @type {import('postcss').AtRule} */ (curr));
    }
    curr = curr.parent;
  }
  return chain;
}

class LayerRegistry {
  constructor() {
    this.nextIndex = 0;
    /** @type {Map<string, { index: number, children: LayerRegistry }>} */
    this.layers = new Map();
    /** @type {Map<import('postcss').AtRule, { index: number, children: LayerRegistry }>} */
    this.anonymous = new Map();
  }

  /**
   * @param {string} name
   * @return {{ index: number, children: LayerRegistry }}
   */
  getOrCreate(name) {
    let entry = this.layers.get(name);
    if (!entry) {
      entry = { index: this.nextIndex++, children: new LayerRegistry() };
      this.layers.set(name, entry);
    }
    return entry;
  }

  /**
   * Entry for a layer with no name or an unparseable name: every occurrence
   * is a unique cascade layer, but names nested inside still order beneath
   * it through the child registry.
   *
   * @param {import('postcss').AtRule} layerRule
   * @return {{ index: number, children: LayerRegistry }}
   */
  getOrCreateAnonymous(layerRule) {
    let entry = this.anonymous.get(layerRule);
    if (!entry) {
      entry = { index: this.nextIndex++, children: new LayerRegistry() };
      this.anonymous.set(layerRule, entry);
    }
    return entry;
  }

  /**
   * The registry entry a single layer at-rule occupies, creating missing
   * segments as needed. Statement lists and unparseable names fall back to a
   * unique anonymous entry so they order but never match another spelling.
   *
   * @param {import('postcss').AtRule} layerRule
   * @return {{ index: number, children: LayerRegistry }}
   */
  entryFor(layerRule) {
    const names = layerRule.params.trim()
      ? parseLayerNameList(layerRule.params)
      : null;
    if (names === null || names.length !== 1) {
      return this.getOrCreateAnonymous(layerRule);
    }
    let entry = this.getOrCreate(names[0][0]);
    for (let i = 1; i < names[0].length; i++) {
      entry = entry.children.getOrCreate(names[0][i]);
    }
    return entry;
  }

  /**
   * Registers the layers a @layer at-rule declares, in document order and
   * nested beneath any enclosing layers, so later lookups observe the real
   * layer tree.
   *
   * @param {import('postcss').AtRule} layerRule
   * @return {void}
   */
  declareLayerAtRule(layerRule) {
    /** @type {LayerRegistry} */
    let current = this;
    for (const parent of enclosingLayerRules(layerRule)) {
      current = current.entryFor(parent).children;
    }
    if (!layerRule.params.trim()) {
      // An unnamed block layer is itself a unique anonymous layer; register
      // it so nested names order beneath it.
      if (layerRule.nodes) {
        current.getOrCreateAnonymous(layerRule);
      }
      return;
    }
    const names = parseLayerNameList(layerRule.params);
    if (names === null) {
      return;
    }
    for (const segments of names) {
      let entry = current.getOrCreate(segments[0]);
      for (let i = 1; i < segments.length; i++) {
        entry = entry.children.getOrCreate(segments[i]);
      }
    }
  }

  /**
   * @param {import('postcss').Node} node
   * @return {number[]}
   */
  getPriority(node) {
    const chain = enclosingLayerRules(node);
    if (chain.length === 0) {
      return [Infinity];
    }

    /** @type {number[]} */
    const priority = [];
    /** @type {LayerRegistry} */
    let current = this;
    for (const layerRule of chain) {
      const entry = current.entryFor(layerRule);
      priority.push(entry.index);
      current = entry.children;
    }
    priority.push(Infinity);
    return priority;
  }
}

/**
 * @param {number[]} p1
 * @param {number[]} p2
 * @return {number}
 */
function compareLayerPriority(p1, p2) {
  const len = Math.min(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    if (p1[i] !== p2[i]) {
      return p1[i] - p2[i];
    }
  }
  return p1.length - p2.length;
}

/**
 * @param {{ layerPriority: number[], documentIndex: number }} a
 * @param {{ layerPriority: number[], documentIndex: number }} b
 * @return {number}
 */
function compareAtRulePriority(a, b) {
  const layerCmp = compareLayerPriority(a.layerPriority, b.layerPriority);
  if (layerCmp !== 0) {
    return layerCmp;
  }
  return a.documentIndex - b.documentIndex;
}

export { LayerRegistry, compareAtRulePriority };

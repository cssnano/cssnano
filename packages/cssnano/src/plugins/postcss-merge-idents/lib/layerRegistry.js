import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { preludeTokens } from './trailingEscape.js';

const { asciiLowerCase, decoded } = cssnanoUtils;

/** @import {TextTable} from '../../../values/textTable.js' */

/**
 * Parses the tokens of a @layer parameter list into decoded layer-name paths.
 * A period is a separator only as a Delim token between idents; an escaped dot
 * is part of the preceding identifier's value, so `a\.b` is one segment named
 * "a.b". Whitespace and comments around separators are allowed, preserving the
 * previous handling of `a . b`.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} parsedTokens
 *   the tokens of the layer's prelude
 * @return {string[][] | null} one decoded segment path per declared name
 */
function parseLayerNameList(parsedTokens) {
  const tokenList = parsedTokens.filter(
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
  /** @param {TextTable} table the text the walk stored */
  constructor(table) {
    this.table = table;
    this.nextIndex = 0;
    /** @type {Map<string, { index: number, children: LayerRegistry }>} */
    this.layers = new Map();
    /** @type {Map<import('postcss').AtRule, { index: number, children: LayerRegistry }>} */
    this.entries = new Map();
  }

  /**
   * @param {string} name
   * @return {{ index: number, children: LayerRegistry }}
   */
  getOrCreate(name) {
    let entry = this.layers.get(name);
    if (!entry) {
      entry = {
        index: this.nextIndex++,
        children: new LayerRegistry(this.table),
      };
      this.layers.set(name, entry);
    }
    return entry;
  }

  /**
   * The entry at a segment path, creating the missing segments.
   *
   * @param {string[]} segments
   * @return {{ index: number, children: LayerRegistry }}
   */
  entryAt(segments) {
    let entry = this.getOrCreate(segments[0]);
    for (let i = 1; i < segments.length; i++) {
      entry = entry.children.getOrCreate(segments[i]);
    }
    return entry;
  }

  /**
   * The registry entry a single layer at-rule occupies, creating missing
   * segments as needed. Statement lists and unparseable names fall back to a
   * unique entry, so they order but never match another spelling; names nested
   * inside still order beneath it through the child registry. A rule keeps one
   * entry, so its name is read once however many definitions it holds.
   *
   * @param {import('postcss').AtRule} layerRule
   * @return {{ index: number, children: LayerRegistry }}
   */
  entryFor(layerRule) {
    let entry = this.entries.get(layerRule);
    if (entry === undefined) {
      const names = layerRule.params.trim()
        ? parseLayerNameList(preludeTokens(layerRule, this.table))
        : null;
      entry =
        names !== null && names.length === 1
          ? this.entryAt(names[0])
          : {
              index: this.nextIndex++,
              children: new LayerRegistry(this.table),
            };
      this.entries.set(layerRule, entry);
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
    // A block takes at most one name. Browsers drop a block with a name list,
    // so it declares none; like an unnamed block, it is a unique entry.
    if (layerRule.nodes) {
      current.entryFor(layerRule);
      return;
    }
    if (!layerRule.params.trim()) {
      return;
    }
    const names = parseLayerNameList(preludeTokens(layerRule, this.table));
    if (names === null) {
      return;
    }
    for (const segments of names) {
      current.entryAt(segments);
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

/**
 * Whether the stylesheet imports another. An imported stylesheet can declare
 * layers before this one does, so the layer order is not known from this
 * stylesheet alone. An import rule is valid only before every rule except
 * `@charset` and layer statements.
 *
 * @param {import('postcss').Root} root
 * @return {boolean}
 */
function hasImport(root) {
  for (const node of root.nodes) {
    if (node.type === 'comment') continue;
    if (node.type !== 'atrule') return false;
    const name = asciiLowerCase(node.name);
    if (name === 'import') return true;
    if (name !== 'charset' && !(name === 'layer' && !node.nodes)) return false;
  }
  return false;
}

export { LayerRegistry, compareAtRulePriority, hasImport };

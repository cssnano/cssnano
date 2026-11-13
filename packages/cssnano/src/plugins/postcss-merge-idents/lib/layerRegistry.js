import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  COMMENT,
} from '../../../passes/ir/blockRecord.js';
import { isLayerEntry } from './grammar.js';
import { preludeTokens } from './trailingEscape.js';
import { atRuleAt, preludeTextOf } from '../../../passes/ir/declaredText.js';

const { decoded } = cssnanoUtils;

/** @import {ArenaIndex} from '../../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../passes/ir/blockRecords.js' */
/** @import {TokenLists} from '../../../passes/ir/tokenLists.js' */

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
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {ArenaIndex[]} enclosing @layer at-rules, outermost first
 */
function enclosingLayerRules(records, index) {
  const { links, root } = records;
  /** @type {ArenaIndex[]} */
  const chain = [];
  for (
    let curr = links.parentOf(index);
    curr !== -1 && curr !== root.index;
    curr = links.parentOf(curr)
  ) {
    if (isLayerEntry(records.entry(curr))) chain.unshift(curr);
  }
  return chain;
}

class LayerRegistry {
  /**
   * @param {BlockRecords} records the stylesheet the layers are in
   * @param {TokenLists} tokenLists the run's token lists, which the preludes name
   */
  constructor(records, tokenLists) {
    this.records = records;
    this.tokenLists = tokenLists;
    this.nextIndex = 0;
    /** @type {Map<string, { index: number, children: LayerRegistry }>} */
    this.layers = new Map();
    /** @type {Map<ArenaIndex, { index: number, children: LayerRegistry }>} */
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
        children: new LayerRegistry(this.records, this.tokenLists),
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
   * @param {ArenaIndex} layerRule
   * @return {{ index: number, children: LayerRegistry }}
   */
  entryFor(layerRule) {
    let entry = this.entries.get(layerRule);
    if (entry === undefined) {
      const names = preludeTextOf(
        this.tokenLists,
        atRuleAt(this.records, layerRule)
      ).trim()
        ? parseLayerNameList(
            preludeTokens(this.records, this.tokenLists, layerRule)
          )
        : null;
      entry =
        names !== null && names.length === 1
          ? this.entryAt(names[0])
          : {
              index: this.nextIndex++,
              children: new LayerRegistry(this.records, this.tokenLists),
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
   * @param {ArenaIndex} layerRule
   * @return {void}
   */
  declareLayerAtRule(layerRule) {
    /** @type {LayerRegistry} */
    let current = this;
    for (const parent of enclosingLayerRules(this.records, layerRule)) {
      current = current.entryFor(parent).children;
    }
    // A block takes at most one name. Browsers drop a block with a name list,
    // so it declares none; like an unnamed block, it is a unique entry.
    if (atRuleAt(this.records, layerRule).kind === AT_RULE_BLOCK) {
      current.entryFor(layerRule);
      return;
    }
    if (
      !preludeTextOf(this.tokenLists, atRuleAt(this.records, layerRule)).trim()
    ) {
      return;
    }
    const names = parseLayerNameList(
      preludeTokens(this.records, this.tokenLists, layerRule)
    );
    if (names === null) {
      return;
    }
    for (const segments of names) {
      current.entryAt(segments);
    }
  }

  /**
   * @param {ArenaIndex} index
   * @return {number[]}
   */
  getPriority(index) {
    const chain = enclosingLayerRules(this.records, index);
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
 * @param {BlockRecords} records
 * @return {boolean}
 */
function hasImport(records) {
  const { links, root } = records;
  for (
    let index = links.firstChild(root.index);
    index !== -1;
    index = links.nextSibling(index)
  ) {
    const node = records.entry(index);
    if (node.kind === COMMENT) continue;
    if (node.kind !== AT_RULE_BLOCK && node.kind !== AT_RULE_STATEMENT) {
      return false;
    }
    if (node.name === 'import') return true;
    if (
      node.name !== 'charset' &&
      !(node.name === 'layer' && node.kind === AT_RULE_STATEMENT)
    ) {
      return false;
    }
  }
  return false;
}

export { LayerRegistry, compareAtRulePriority, hasImport };

import cssnanoUtils from '#utils';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  DECLARATION,
  RULE,
} from '../passes/ir/blockRecord.js';

/** @import {AnyNode, AtRule, Declaration, Rule} from 'postcss' */
/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {TokenLists} from '../passes/ir/tokenLists.js' */

const { asciiLowerCase } = cssnanoUtils;
const fontRegex = /font(|-family)/v;
const listStyleRegex = /list-style|system/v;
const animationRegex = /animation/v;
const zIndexRegex = /^[zZ]-[iI][nN][dD][eE][xX]$/v;
const counterStyleRegex = /counter-style/v;
const keyframesRegex = /keyframes/v;

/**
 * The nodes that the advanced transforms read, by kind. The walk after merge
 * fills them, so each transform edits lists rather than walking the tree.
 *
 * @typedef {object} SymbolLists
 * @property {AtRule[]} fontFaces `@font-face` blocks
 * @property {AtRule[]} counterStyles `@counter-style` at-rules
 * @property {AtRule[]} keyframes `@keyframes` at-rules
 * @property {AtRule[]} namespaces `@namespace` at-rules
 * @property {Rule[]} namespaceRules rules whose selector has a namespace bar
 * @property {Declaration[]} fontDecls `font` and `font-family` declarations in a rule
 * @property {Declaration[]} listStyleDecls `list-style` and `system` declarations
 * @property {Declaration[]} animationDecls `animation` declarations
 * @property {Declaration[]} zIndexDecls `z-index` declarations
 * @property {AtRule[]} layers `@layer` at-rules, with or without a block
 * @property {AtRule[]} functions `@function` rules
 * @property {AtRule[]} parameterRules `@mixin` and `@apply` rules
 * @property {AtRule[]} conditionRules `@container`, `@when` and `@else` rules
 * @property {Declaration[]} decls every declaration
 */

/**
 * @returns {SymbolLists}
 */
export function createSymbolLists() {
  return {
    fontFaces: [],
    counterStyles: [],
    keyframes: [],
    namespaces: [],
    namespaceRules: [],
    fontDecls: [],
    listStyleDecls: [],
    animationDecls: [],
    zIndexDecls: [],
    layers: [],
    functions: [],
    parameterRules: [],
    conditionRules: [],
    decls: [],
  };
}

/**
 * Whether a node still hangs from the root. A transform that ran before a
 * removal may have detached a node that the lists hold.
 *
 * @param {AnyNode} node
 * @returns {boolean}
 */
export function isAttached(node) {
  let curr = node.parent;
  while (curr && curr.type !== 'root') curr = curr.parent;
  return curr !== undefined;
}

/**
 * Sorts one kept node into the lists it belongs to. Names are matched the way
 * the transforms match them, so a list holds exactly what they would find.
 *
 * @param {SymbolLists} lists
 * @returns {(node: AnyNode) => void}
 */
export function symbolVisit(lists) {
  return (node) => {
    if (node.type === 'atrule') {
      visitAtRule(lists, node);
    } else if (node.type === 'decl') {
      visitDecl(lists, node);
    } else if (node.type === 'rule' && node.selector.includes('|')) {
      lists.namespaceRules.push(node);
    }
  };
}

/**
 * @param {SymbolLists} lists
 * @param {AtRule} node
 */
function visitAtRule(lists, node) {
  const name = asciiLowerCase(node.name);
  if (name === 'font-face' && node.nodes) {
    lists.fontFaces.push(node);
  }
  if (counterStyleRegex.test(name)) {
    lists.counterStyles.push(node);
  }
  if (keyframesRegex.test(name)) {
    lists.keyframes.push(node);
  }
  if (name === 'namespace') {
    lists.namespaces.push(node);
  }
  if (name === 'layer') lists.layers.push(node);
  if (name === 'function') lists.functions.push(node);
  if (name === 'mixin' || name === 'apply') lists.parameterRules.push(node);
  if (name === 'container' || name === 'when' || name === 'else') {
    lists.conditionRules.push(node);
  }
}

/**
 * @param {SymbolLists} lists
 * @param {Declaration} node
 */
function visitDecl(lists, node) {
  const prop = asciiLowerCase(node.prop);
  lists.decls.push(node);
  if (zIndexRegex.test(node.prop)) {
    lists.zIndexDecls.push(node);
  }
  if (listStyleRegex.test(prop)) {
    lists.listStyleDecls.push(node);
  }
  if (node.parent?.type === 'rule' && fontRegex.test(prop)) {
    lists.fontDecls.push(node);
  }
  if (animationRegex.test(prop)) {
    lists.animationDecls.push(node);
  }
}

/**
 * The records that the advanced transforms read, by kind: the same lists as
 * `SymbolLists`, holding the arena indices of the records.
 *
 * @typedef {{[K in keyof SymbolLists]: ArenaIndex[]}} RecordSymbolLists
 */

/**
 * @returns {RecordSymbolLists}
 */
export function createRecordSymbolLists() {
  return {
    fontFaces: [],
    counterStyles: [],
    keyframes: [],
    namespaces: [],
    namespaceRules: [],
    fontDecls: [],
    listStyleDecls: [],
    animationDecls: [],
    zIndexDecls: [],
    layers: [],
    functions: [],
    parameterRules: [],
    conditionRules: [],
    decls: [],
  };
}

/**
 * Whether an entry still hangs from the stylesheet. A removed container's
 * children still name it as their parent, so the walk must reach the root.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @returns {boolean}
 */
export function isRecordAttached(records, index) {
  const { links, root } = records;
  /** @type {ArenaIndex | -1} */
  let at = index;
  while (at !== root.index) {
    at = links.parentOf(at);
    if (at === -1) return false;
  }
  return true;
}

/**
 * Sorts one kept record into the lists it belongs to, as `symbolVisit` does for
 * a node. A rule's selector has a namespace bar when one of its selector lists
 * holds a `|` token.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {RecordSymbolLists} lists
 * @param {ArenaIndex} index
 * @returns {void}
 */
export function recordSymbolVisit(records, tokenLists, lists, index) {
  const entry = records.entry(index);
  if (entry.kind === AT_RULE_BLOCK || entry.kind === AT_RULE_STATEMENT) {
    visitRecordAtRule(lists, index, entry);
  } else if (entry.kind === DECLARATION) {
    visitRecordDecl(records, lists, index, entry);
  } else if (
    entry.kind === RULE &&
    hasNamespaceBar(tokenLists, entry.selectorIds)
  ) {
    lists.namespaceRules.push(index);
  }
}

/**
 * @param {TokenLists} tokenLists
 * @param {readonly import('../passes/ir/tokenLists.js').TokenListId[]} ids
 * @returns {boolean}
 */
function hasNamespaceBar(tokenLists, ids) {
  for (const id of ids) {
    for (const token of tokenLists.get(id)) {
      if (token[1].includes('|')) return true;
    }
  }
  return false;
}

/**
 * @param {RecordSymbolLists} lists
 * @param {ArenaIndex} index
 * @param {import('../passes/ir/blockRecord.js').BlockRecord | import('../passes/ir/blockRecord.js').NodeEntry} entry
 */
function visitRecordAtRule(lists, index, entry) {
  const { name } = entry;
  if (name === 'font-face' && entry.kind === AT_RULE_BLOCK) {
    lists.fontFaces.push(index);
  }
  if (counterStyleRegex.test(name)) lists.counterStyles.push(index);
  if (keyframesRegex.test(name)) lists.keyframes.push(index);
  if (name === 'namespace') lists.namespaces.push(index);
  if (name === 'layer') lists.layers.push(index);
  if (name === 'function') lists.functions.push(index);
  if (name === 'mixin' || name === 'apply') lists.parameterRules.push(index);
  if (name === 'container' || name === 'when' || name === 'else') {
    lists.conditionRules.push(index);
  }
}

/**
 * @param {BlockRecords} records
 * @param {RecordSymbolLists} lists
 * @param {ArenaIndex} index
 * @param {import('../passes/ir/declarationRecord.js').DeclarationRecord} entry
 */
function visitRecordDecl(records, lists, index, entry) {
  const prop = asciiLowerCase(entry.prop);
  lists.decls.push(index);
  if (zIndexRegex.test(entry.prop)) lists.zIndexDecls.push(index);
  if (listStyleRegex.test(prop)) lists.listStyleDecls.push(index);
  if (
    records.enclosingContainer(index)?.kind === RULE &&
    fontRegex.test(prop)
  ) {
    lists.fontDecls.push(index);
  }
  if (animationRegex.test(prop)) lists.animationDecls.push(index);
}

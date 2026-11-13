import cssnanoUtils from '#utils';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  DECLARATION,
  RULE,
} from '../passes/ir/blockRecord.js';

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
 * The records that the advanced transforms read, by kind, as the arena indices
 * of the records: `@font-face` blocks, counter styles, keyframes, namespaces,
 * rules with a namespace bar, font and list-style and animation declarations,
 * z-index declarations, layers, functions, parameter rules, condition rules,
 * and every declaration.
 *
 * @typedef {{
 *   fontFaces: ArenaIndex[],
 *   counterStyles: ArenaIndex[],
 *   keyframes: ArenaIndex[],
 *   namespaces: ArenaIndex[],
 *   namespaceRules: ArenaIndex[],
 *   fontDecls: ArenaIndex[],
 *   listStyleDecls: ArenaIndex[],
 *   animationDecls: ArenaIndex[],
 *   zIndexDecls: ArenaIndex[],
 *   layers: ArenaIndex[],
 *   functions: ArenaIndex[],
 *   parameterRules: ArenaIndex[],
 *   conditionRules: ArenaIndex[],
 *   decls: ArenaIndex[],
 * }} RecordSymbolLists
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
 * Sorts one kept record into the lists it belongs to. A rule's selector has a
 * namespace bar when one of its selector lists holds a `|` token.
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

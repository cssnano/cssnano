import cssnanoUtils from '#utils';

/** @import {AnyNode, AtRule, Declaration, Rule} from 'postcss' */

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

import { syntaxAllowsPercentage } from '../utils/syntaxPercentage.js';
import cssnanoUtils from '#utils';
import { AT_RULE_BLOCK, DECLARATION } from '../passes/ir/blockRecord.js';
import { declaredValue } from '../passes/ir/declaredText.js';

/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {DeclarationRecord} from '../passes/ir/declarationRecord.js' */
/** @import {TokenLists} from '../passes/ir/tokenLists.js' */

/** @import {AtRule, Container, Document} from 'postcss' */

/**
 * The context of a declaration is an integer whose bits say where it sits. The
 * bits are added rather than or-ed, since the repository forbids bitwise
 * operators.
 */

/** Inside an at-rule whose name ends in `keyframes`. */
export const IN_KEYFRAMES = 1;
/** A direct declaration of an `@property` rule. */
export const IN_PROPERTY = 2;
/** With IN_PROPERTY, when the rule's syntax allows percentages. */
export const PERCENTAGE_SYNTAX = 4;
/** A rule directly inside an at-rule named `keyframes` or a vendor spelling of it. */
export const KEYFRAME_RULE = 8;
/**
 * Set by the walk on a rule after a default `@namespace`, which makes a
 * universal selector significant there.
 */
export const DEFAULT_NAMESPACE = 16;

/**
 * The names that give a rule keyframe-selector semantics. Other suffixes that
 * end in `keyframes` do not.
 * @type {ReadonlySet<string>}
 */
const keyframeAtRuleNames = new Set([
  'keyframes',
  '-webkit-keyframes',
  '-moz-keyframes',
  '-o-keyframes',
]);

/**
 * @param {number} context
 * @param {number} bit one of the context bits
 * @returns {boolean} whether the bit is set
 */
export function hasContextBit(context, bit) {
  return Math.floor(context / bit) % 2 === 1;
}

/**
 * @param {number} context
 * @param {number} bit a context bit that is not yet set in the context
 * @returns {number} the context with the bit set
 */
export function withBit(context, bit) {
  return hasContextBit(context, bit) ? context : context + bit;
}

/**
 * Whether the syntax of an `@property` rule allows percentages. The last syntax
 * declaration decides, as CSS specifies for a repeated descriptor, and a rule
 * without one allows them.
 *
 * @param {AtRule} atRule an `@property` rule
 * @returns {boolean}
 */
function propertyAllowsPercentage(atRule) {
  const syntax = atRule.nodes?.findLast(
    (node) => node.type === 'decl' && node.prop.toLowerCase() === 'syntax'
  );
  return syntax?.type !== 'decl' || syntaxAllowsPercentage(syntax.value);
}

/**
 * The context of the declarations that a container holds directly. Each
 * container is computed once from its parent, through the cache of the run.
 *
 * @param {Container | Document} node a rule, at-rule or the root
 * @param {WeakMap<Container | Document, number>} contexts the context of each container of the run
 * @returns {number}
 */
export function contextOf(node, contexts) {
  const known = contexts.get(node);
  if (known !== undefined) return known;

  let context = 0;
  if (
    node.parent &&
    hasContextBit(contextOf(node.parent, contexts), IN_KEYFRAMES)
  ) {
    context = IN_KEYFRAMES;
  }
  if (node.type === 'atrule') {
    const atRule = /** @type {AtRule} */ (node);
    const name = cssnanoUtils.asciiLowerCase(atRule.name);
    if (name.endsWith('keyframes')) context = withBit(context, IN_KEYFRAMES);
    if (name === 'property') {
      context = withBit(context, IN_PROPERTY);
      if (propertyAllowsPercentage(atRule)) {
        context = withBit(context, PERCENTAGE_SYNTAX);
      }
    }
  }
  if (node.parent?.type === 'atrule') {
    const name = cssnanoUtils.asciiLowerCase(
      /** @type {AtRule} */ (node.parent).name
    );
    if (keyframeAtRuleNames.has(name))
      context = withBit(context, KEYFRAME_RULE);
  }
  contexts.set(node, context);
  return context;
}

/**
 * Whether the syntax of an `@property` record allows percentages. The last
 * direct syntax declaration decides, and a rule without one allows them.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index an `@property` record
 * @returns {boolean}
 */
function recordAllowsPercentage(records, tokenLists, index) {
  /** @type {DeclarationRecord | undefined} */
  let syntax;
  for (
    let child = records.links.firstChild(index);
    child !== -1;
    child = records.links.nextSibling(child)
  ) {
    const entry = records.entry(/** @type {ArenaIndex} */ (child));
    if (entry.kind === DECLARATION && entry.prop.toLowerCase() === 'syntax') {
      syntax = /** @type {DeclarationRecord} */ (entry);
    }
  }
  if (syntax === undefined) return true;
  return syntaxAllowsPercentage(declaredValue(tokenLists, syntax));
}

/**
 * The context of a container record, from its parent's context, as the node
 * form `contextOf` gives it for a container node. The stylesheet is the only
 * container without a parent, and its context is 0.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index a rule or an at-rule with a block
 * @param {number} parentContext the context of the container that holds it
 * @returns {number}
 */
export function recordContextOf(records, tokenLists, index, parentContext) {
  const entry = records.entry(index);
  let context = 0;
  if (hasContextBit(parentContext, IN_KEYFRAMES)) context = IN_KEYFRAMES;
  if (entry.kind === AT_RULE_BLOCK) {
    if (entry.name.endsWith('keyframes')) {
      context = withBit(context, IN_KEYFRAMES);
    }
    if (entry.name === 'property') {
      context = withBit(context, IN_PROPERTY);
      if (recordAllowsPercentage(records, tokenLists, index)) {
        context = withBit(context, PERCENTAGE_SYNTAX);
      }
    }
  }
  const parent = records.links.parentOf(index);
  if (parent !== -1) {
    const holder = records.entry(/** @type {ArenaIndex} */ (parent));
    if (holder.kind === AT_RULE_BLOCK && keyframeAtRuleNames.has(holder.name)) {
      context = withBit(context, KEYFRAME_RULE);
    }
  }
  return context;
}

import { syntaxAllowsPercentage } from '../utils/syntaxPercentage.js';
import { AT_RULE_BLOCK, DECLARATION } from '../passes/ir/blockRecord.js';
import { declaredValue } from '../passes/ir/declaredText.js';

/** @import {ArenaIndex, BlockRecord, NodeEntry} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {DeclarationRecord} from '../passes/ir/declarationRecord.js' */
/** @import {TokenLists} from '../passes/ir/tokenLists.js' */

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
 * The bits that a rule or at-rule gets from the context its parent passes down
 * and from the holder it sits in: the keyframes bit is inherited, and a rule
 * directly inside a keyframes at-rule takes KEYFRAME_RULE.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {number} parentContext the context of the container that holds it
 * @returns {number}
 */
function inheritedBitsOf(records, index, parentContext) {
  let context = hasContextBit(parentContext, IN_KEYFRAMES) ? IN_KEYFRAMES : 0;
  const parent = records.links.parentOf(index);
  if (parent !== -1) {
    const holder = records.entry(/** @type {ArenaIndex} */ (parent));
    if (holder.kind === AT_RULE_BLOCK && keyframeAtRuleNames.has(holder.name)) {
      context = withBit(context, KEYFRAME_RULE);
    }
  }
  return context;
}

/**
 * The bits an at-rule adds from its own folded name: a keyframes name, and an
 * `@property` with its syntax bit.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index an at-rule record
 * @param {string} name the folded name of the at-rule
 * @param {number} context the bits the at-rule inherits
 * @returns {number}
 */
function withNameBits(records, tokenLists, index, name, context) {
  let result = context;
  if (name.endsWith('keyframes')) result = withBit(result, IN_KEYFRAMES);
  if (name === 'property') {
    result = withBit(result, IN_PROPERTY);
    if (recordAllowsPercentage(records, tokenLists, index)) {
      result = withBit(result, PERCENTAGE_SYNTAX);
    }
  }
  return result;
}

/**
 * The context of a rule or an at-rule with a block, from the context its parent
 * passes down. The stylesheet is the only container without a parent, and its
 * context is 0.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index a rule or an at-rule with a block
 * @param {number} parentContext the context of the container that holds it
 * @returns {number}
 */
export function recordContextOf(records, tokenLists, index, parentContext) {
  const entry = records.entry(index);
  const context = inheritedBitsOf(records, index, parentContext);
  if (entry.kind === AT_RULE_BLOCK) {
    return withNameBits(records, tokenLists, index, entry.name, context);
  }
  return context;
}

/**
 * The context of an at-rule statement, which holds no container. The record
 * walk gives its prelude the bits the statement would have as a container.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index an at-rule statement record
 * @param {number} parentContext the context of the container that holds it
 * @returns {number}
 */
export function statementContextOf(records, tokenLists, index, parentContext) {
  const { name } = /** @type {BlockRecord | NodeEntry} */ (
    records.entry(index)
  );
  return withNameBits(
    records,
    tokenLists,
    index,
    name,
    inheritedBitsOf(records, index, parentContext)
  );
}

import { syntaxAllowsPercentage } from '../plugins/postcss-convert-values/lib/parseSyntax.js';

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
function withBit(context, bit) {
  return hasContextBit(context, bit) ? context : context + bit;
}

/**
 * Whether the syntax of an `@property` rule allows percentages. The first syntax
 * declaration decides, and a rule without one allows them.
 *
 * @param {AtRule} atRule an `@property` rule
 * @returns {boolean}
 */
function propertyAllowsPercentage(atRule) {
  const syntax = atRule.nodes?.find(
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
    const name = atRule.name.toLowerCase();
    if (name.endsWith('keyframes')) context = withBit(context, IN_KEYFRAMES);
    if (name === 'property') {
      context = withBit(context, IN_PROPERTY);
      if (propertyAllowsPercentage(atRule)) {
        context = withBit(context, PERCENTAGE_SYNTAX);
      }
    }
  }
  contexts.set(node, context);
  return context;
}

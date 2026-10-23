import cssnanoUtils from '#utils';

/** @import {AtRule, Container, Document} from 'postcss' */

const OVERRIDABLE_RULES = new Set(['keyframes', 'counter-style']);
const SCOPE_RULES = new Set(['media', 'supports', 'container', 'layer']);

/**
 * @param {string} name
 * @return {boolean}
 */
function isOverridable(name) {
  return OVERRIDABLE_RULES.has(
    cssnanoUtils.vendorUnprefixed(name.toLowerCase())
  );
}

/**
 * @param {string} name
 * @return {boolean}
 */
function isScope(name) {
  return SCOPE_RULES.has(cssnanoUtils.vendorUnprefixed(name.toLowerCase()));
}

/**
 * Whether an at-rule is overridable and no at-rule around it is. The walk
 * collects only these, as the old plugin never visited an overridable at-rule
 * inside another.
 *
 * @param {AtRule} atRule
 * @return {boolean}
 */
export function isOutermostOverridable(atRule) {
  if (!isOverridable(atRule.name)) return false;
  let current = /** @type {Container | Document | undefined} */ (atRule.parent);
  while (current) {
    if (
      current.type === 'atrule' &&
      isOverridable(/** @type {AtRule} */ (current).name)
    ) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

/**
 * The scope of an at-rule: its name and prelude, chained with those of the
 * scope at-rules around it, as the prelude reads after the stylesheet is folded.
 *
 * @param {AtRule} node
 * @return {string}
 */
function getScope(node) {
  /** @type {Container | Document | undefined} */
  let current = node.parent;

  const chain = [node.name.toLowerCase(), node.params];

  while (current) {
    if (
      current.type === 'atrule' &&
      isScope(/** @type {AtRule} */ (current).name)
    ) {
      const atRule = /** @type {AtRule} */ (current);
      chain.unshift(
        atRule.params
          ? atRule.name.toLowerCase() + ' ' + atRule.params
          : atRule.name.toLowerCase()
      );
    }
    current = current.parent;
  }

  return chain.join('|');
}

/**
 * Removes each overridable at-rule that a later one in its scope overrides. The
 * list is in document order, and it is read backwards, so the winning rule of
 * each scope is seen first.
 *
 * @param {readonly AtRule[]} overridable the outermost overridable at-rules, in document order
 * @return {void}
 */
export function discardOverriddenAtRules(overridable) {
  const seen = new Set();
  for (let index = overridable.length - 1; index >= 0; index--) {
    const node = overridable[index];
    const scope = getScope(node);
    if (seen.has(scope)) {
      node.remove();
    } else {
      seen.add(scope);
    }
  }
}

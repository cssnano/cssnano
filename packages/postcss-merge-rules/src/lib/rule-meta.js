/** @import {Declaration, Rule} from 'postcss' */

/**
 * @typedef {Object} RuleMeta
 * @property {string[]} selectors
 * @property {Declaration[]} declarations
 * @property {boolean} dirty
 */

/**
 * @param {import('postcss').ChildNode} node
 * @return {node is Declaration}
 */
function isDeclaration(node) {
  return node.type === 'decl';
}

/**
 * @param {Rule} rule
 * @param {WeakMap<Rule, RuleMeta>} [ruleMeta]
 * @return {RuleMeta}
 */
export function getMeta(rule, ruleMeta) {
  if (ruleMeta && rule) {
    let meta = ruleMeta.get(rule);
    if (!meta && rule.nodes) {
      meta = {
        selectors: rule.selectors,
        declarations: rule.nodes.filter(isDeclaration),
        dirty: false,
      };
      ruleMeta.set(rule, meta);
    }
    return meta ?? { selectors: [], declarations: [], dirty: false };
  }
  return {
    selectors: rule?.selectors ?? [],
    declarations: rule?.nodes?.filter(isDeclaration) ?? [],
    dirty: false,
  };
}

/**
 * @param {Rule} rule
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 */
export function flush(rule, ruleMeta) {
  const meta = ruleMeta.get(rule);
  if (meta && meta.dirty) {
    rule.selector = meta.selectors.join(',');
    meta.dirty = false;
  }
}

/** @param {Rule} rule @return {Declaration[]} */
export function getDecls(rule) {
  return rule.nodes.filter(isDeclaration);
}
